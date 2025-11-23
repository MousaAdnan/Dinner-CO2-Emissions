// src/App.tsx
import { useState } from "react";
import { INGREDIENTS } from "./data/ingredients";

const BASE_URL = "https://climate-plate-backend-6cykvp3hlq-uc.a.run.app";

// This describes the shape of the "selections" state.
type SelectionState = {
    [id: string]: {
        isSelected: boolean;
        grams: number;
    };
};

// Which screen are we on?
type View = "build" | "results";

// Local summary type for the results page (for UI text)
type ResultItem = {
    id: string;
    name: string;
    grams: number;
};

type LocalResultSummary = {
    totalGrams: number;
    items: ResultItem[];
};

type BackendPlateItem = {
    ingredient_id: number;
    name: string;
    quantity_g: number;
    co2_kg: number;
    freshwater_l: number;
    land_m2: number;
};

type BackendPlateSummary = {
    session_id: string;
    total_co2_kg: number;
    total_freshwater_l: number;
    total_land_m2: number;
    impact_score_1_to_10: number;
    items: BackendPlateItem[];
};

const FOOD_FACTS: Record<string, string> = {
    Beef: "Beef typically has one of the highest CO₂ footprints per gram of protein.",
    Chicken:
        "Chicken usually has less climate impact than beef but more than most plants.",
    Fish:
        "Fish can be lower in emissions than red meat, but it depends a lot on how it’s caught or farmed.",
    Rice:
        "Rice paddies emit methane, a powerful greenhouse gas, especially in flooded fields.",
    Potato:
        "Potatoes are a relatively low-emission source of carbohydrates compared to many grains.",
    Bread:
        "Bread’s impact mostly comes from growing and processing wheat, plus baking energy.",
    Eggs:
        "Eggs have a moderate climate impact, lower than beef and cheese per gram of protein.",
    Peas: "Peas and other legumes are among the lowest-emission protein sources.",
};

function App() {
    // Helper: CO2 color based on total kg
    const getCo2Class = (co2: number | null | undefined) => {
        if (co2 == null) return "bg-[rgb(77,59,63)]"; // neutral
        if (co2 <= 2) return "bg-green-600";
        if (co2 <= 5) return "bg-yellow-500";
        return "bg-red-600";
    };

// Helper: Water color based on total L
    const getWaterClass = (water: number | null | undefined) => {
        if (water == null) return "bg-[rgb(77,59,63)]";
        if (water <= 100) return "bg-green-600";
        if (water <= 700) return "bg-yellow-500";
        return "bg-red-600";
    };

// Helper: Land color based on total m²
    const getLandClass = (land: number | null | undefined) => {
        if (land == null) return "bg-[rgb(77,59,63)]";
        if (land <= 5) return "bg-green-600";
        if (land <= 20) return "bg-yellow-500";
        return "bg-red-600";
    };

    // React state holding which ingredients are selected + their grams
    const [selections, setSelections] = useState<SelectionState>({});

    // Which page we’re on
    const [view, setView] = useState<View>("build");

    // Local summary for the results page
    const [summary, setSummary] = useState<LocalResultSummary | null>(null);

    // Backend state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [backendSummary, setBackendSummary] = useState<BackendPlateSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Which food is selected in the results "spotlight"
    const [selectedFoodId, setSelectedFoodId] = useState<number | null>(null);

    // Called when a checkbox is toggled (true/false)
    const handleToggleSelect = (id: string, checked: boolean) => {
        setSelections((prev) => ({
            // keep all other ingredients exactly as they were
            ...prev,
            [id]: {
                isSelected: checked,
                // if we already had a grams value for this ingredient, keep it;
                // otherwise default to 125g so the slider isn't at 0
                grams: prev[id]?.grams ?? 125,
            },
        }));
    };

    // Called when the slider for an ingredient moves
    const handleGramsChange = (id: string, gramsValue: string) => {
        // sliders give you a string; convert to number, default to 0 if NaN
        const grams = Number(gramsValue) || 0;

        setSelections((prev) => ({
            ...prev,
            [id]: {
                // if we have a record for this ingredient, keep isSelected as-is;
                // otherwise default to false (slider alone doesn't auto-check)
                isSelected: prev[id]?.isSelected ?? false,
                grams,
            },
        }));
    };

    // Called when the "Done – calculate impact" button is clicked
    const handleDoneClick = async () => {
        setError(null);
        setIsLoading(true);
        setBackendSummary(null);

        // 1) Build list of selected items with names (for local summary)
        const items: ResultItem[] = Object.entries(selections)
            .filter(([_, value]) => value.isSelected && value.grams > 0)
            .map(([id, value]) => {
                const ingredient = INGREDIENTS.find((ing) => ing.id === id);
                if (!ingredient) return null;

                return {
                    id,
                    name: ingredient.name,
                    grams: value.grams,
                };
            })
            .filter((x): x is ResultItem => x !== null);

        if (items.length === 0) {
            setIsLoading(false);
            alert("Pick at least one ingredient first.");
            return;
        }

        const totalGrams = items.reduce((sum, item) => sum + item.grams, 0);
        setSummary({ totalGrams, items }); // local summary for UI text

        try {
            // 2) ALWAYS start a fresh session for each calculation
            const res = await fetch(`${BASE_URL}/session/start`, {
                method: "POST",
            });

            if (!res.ok) {
                throw new Error(`Failed to start session: ${res.status}`);
            }

            const data = await res.json();
            const currentSessionId = data.session_id as string;
            setSessionId(currentSessionId);

            // 3) Send each ingredient to /plate/add
            const selectedForBackend = items
                .map((item) => {
                    const ingredient = INGREDIENTS.find((ing) => ing.id === item.id);
                    if (!ingredient) return null;
                    return {
                        backendId: ingredient.backendId,
                        grams: item.grams,
                    };
                })
                .filter(
                    (x): x is { backendId: number; grams: number } => x !== null
                );

            await Promise.all(
                selectedForBackend.map((item) =>
                    fetch(
                        `${BASE_URL}/plate/add?session_id=${encodeURIComponent(
                            currentSessionId
                        )}&ingredient_id=${item.backendId}&quantity_g=${item.grams}`,
                        { method: "POST" }
                    )
                )
            );

            // 4) Fetch the summary for this session
            const summaryRes = await fetch(
                `${BASE_URL}/impact/summary?session_id=${encodeURIComponent(
                    currentSessionId
                )}`
            );

            if (!summaryRes.ok) {
                throw new Error(`Failed to fetch summary: ${summaryRes.status}`);
            }

            const backendData: BackendPlateSummary = await summaryRes.json();
            setBackendSummary(backendData);

            // Default selected food in spotlight = first item
            if (backendData.items.length > 0) {
                setSelectedFoodId(backendData.items[0].ingredient_id);
            }
        } catch (err: any) {
            console.error("Error talking to backend:", err);
            setError(err?.message ?? "Unknown error talking to backend.");
        } finally {
            setIsLoading(false);
            // Switch to results screen whether backend succeeded or not
            setView("results");
        }
    };

    // Simple helper to go back to builder while keeping current selections
    const handleEditPlate = () => {
        setView("build");
    };

    // Full reset
    const handleStartOver = () => {
        setSelections({});
        setSummary(null);
        setBackendSummary(null);
        setSessionId(null);
        setSelectedFoodId(null);
        setError(null);
        setIsLoading(false);
        setView("build");
    };

    return (
        // Full-screen container: dark background, center content
        <div className="min-h-screen bg-[rgb(41,31,33)] text-slate-100 flex items-center justify-center px-4">
            {view === "build" ? (
                // 🥗 BUILD VIEW
                <div className="w-full max-w-5xl flex gap-10 items-center">
                    {/* LEFT: plate area (NO inner box, just floating on background) */}
                    <div className="flex-[3] flex items-center justify-center">
                        {/* Plate + ingredient overlay live in this responsive square container. */}
                        <div
                            style={{
                                position: "relative", // so children with position:absolute are relative to this box
                                width: "100%",
                                maxWidth: "520px", // tweak this to make the plate bigger/smaller overall
                                aspectRatio: "1 / 1", // square
                                margin: "0 auto", // center inside its flex column
                            }}
                        >
                            {/* PLATE IMAGE — just fills the container */}
                            <img
                                src="/images/plate.png"
                                alt="Plate"
                                draggable={false}
                                style={{
                                    position: "relative", // sits at zIndex 0, ingredients go above
                                    zIndex: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain", // keep plate aspect ratio
                                }}
                            />

                            {/* INGREDIENT IMAGES — rendered on top of the plate */}
                            {INGREDIENTS.map((item) => {
                                const current = selections[item.id];

                                // If this ingredient is NOT selected or grams <= 0, don't render it
                                if (!current?.isSelected || current.grams <= 0) return null;

                                // Compute visual scale based on grams (50–200g => slightly smaller/bigger)
                                const minGrams = 50;
                                const maxGrams = 200;
                                const clamped = Math.max(
                                    minGrams,
                                    Math.min(maxGrams, current.grams)
                                );
                                const t = (clamped - minGrams) / (maxGrams - minGrams); // normalized 0–1
                                const scale = 0.9 + t * 0.35; // final range ~0.9–1.25

                                return (
                                    <img
                                        key={item.id}
                                        src={item.imageSrc}
                                        alt={item.name}
                                        draggable={false}
                                        style={{
                                            position: "absolute",
                                            zIndex: 10, // above the plate
                                            left: `${item.plateX}%`,
                                            top: `${item.plateY}%`,
                                            transform: `translate(-50%, -50%) scale(${scale}) rotate(${
                                                item.rotation ?? 0
                                            }deg)`,
                                            width: item.maxSize,
                                            height: item.maxSize,
                                            objectFit: "contain",
                                            pointerEvents: "none",
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: ingredients panel (inside its own box) */}
                    <div className="flex-[3] bg-[rgb(77,59,63)] rounded-2xl border border-[rgb(232,175,149)] p-4 flex flex-col">
                        <h1 className="font-playfair text-4xl mb-2">
                            Build Your Climate Plate
                        </h1>

                        <p className="text-sm text-slate-300 mb-4">
                            Choose your ingredients and adjust the sliders to match your meal.
                        </p>

                        {/* Scrollable list section in case you add many ingredients later */}
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {INGREDIENTS.map((item) => {
                                const current =
                                    selections[item.id] ||
                                    ({ isSelected: false, grams: 125 } as const);

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-[#4D3B3F] rounded-xl px-3 py-2 flex flex-col gap-2"
                                    >
                                        {/* Top row: checkbox + label on left, grams text on right */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4"
                                                    checked={current.isSelected}
                                                    onChange={(e) =>
                                                        handleToggleSelect(item.id, e.target.checked)
                                                    }
                                                />
                                                <span>{item.name}</span>
                                            </div>

                                            <span className="text-xs text-slate-300">
                        {current.grams} g
                      </span>
                                        </div>

                                        {/* Slider: controls grams from 50–200 in steps of 10 */}
                                        <input
                                            type="range"
                                            min={50}
                                            max={200}
                                            step={10}
                                            value={current.grams}
                                            onChange={(e) =>
                                                handleGramsChange(item.id, e.target.value)
                                            }
                                            className="w-full"
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Submit button */}
                        <button
                            className="mt-4 w-full py-2 rounded-xl bg-[rgb(181,171,161)] text-[rgb(94,73,78)] font-semibold hover:bg-[rgb(232,175,149)] transition"
                            onClick={handleDoneClick}
                        >
                            {isLoading ? "Calculating..." : "Done – calculate impact"}
                        </button>

                        {error && (
                            <p className="mt-2 text-xs text-red-300">
                                There was a problem talking to the server: {error}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                // 🌍 RESULTS VIEW (second page)
                <div className="w-full max-w-6xl bg-[rgb(41,31,33)] text-slate-100 flex flex-col gap-6">
                    {/* TOP: big headline */}
                    <div className="text-center">
                        <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl mb-3">
                            Your plate&apos;s impact is{" "}
                            <span className="text-[rgb(232,175,149)]">
                {backendSummary
                    ? backendSummary.impact_score_1_to_10.toFixed(1)
                    : "–"}
                                /10
              </span>
                        </h1>

                        {summary && (
                            <p className="text-sm md:text-base text-slate-200 max-w-2xl mx-auto">
                                Your meal uses {summary.totalGrams} g of food across{" "}
                                {summary.items.length} ingredient
                                {summary.items.length > 1 ? "s" : ""}. Here&apos;s what that
                                means for the planet.
                            </p>
                        )}
                    </div>

                    {/* MIDDLE: three big stat bubbles */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
                        {/* CO2 CARD */}
                        <div
                            className={`rounded-2xl border border-[rgb(232,175,149)] px-4 py-5 flex flex-col items-center text-slate-100 ${getCo2Class(
                                backendSummary?.total_co2_kg
                            )}`}
                        >
    <span className="text-xs uppercase tracking-wide text-slate-200 mb-1">
      CO₂ cost
    </span>
                            <span className="text-2xl font-semibold">
      {backendSummary ? backendSummary.total_co2_kg.toFixed(2) : "–"} kg
    </span>
                        </div>

                        {/* WATER CARD */}
                        <div
                            className={`rounded-2xl border border-[rgb(232,175,149)] px-4 py-5 flex flex-col items-center text-slate-100 ${getWaterClass(
                                backendSummary?.total_freshwater_l
                            )}`}
                        >
    <span className="text-xs uppercase tracking-wide text-slate-200 mb-1">
      Water usage
    </span>
                            <span className="text-2xl font-semibold">
      {backendSummary ? backendSummary.total_freshwater_l.toFixed(1) : "–"} L
    </span>
                        </div>

                        {/* LAND CARD */}
                        <div
                            className={`rounded-2xl border border-[rgb(232,175,149)] px-4 py-5 flex flex-col items-center text-slate-100 ${getLandClass(
                                backendSummary?.total_land_m2
                            )}`}
                        >
    <span className="text-xs uppercase tracking-wide text-slate-200 mb-1">
      Land usage
    </span>
                            <span className="text-2xl font-semibold">
      {backendSummary ? backendSummary.total_land_m2.toFixed(2) : "–"} m²
    </span>
                        </div>
                    </div>


                    {/* LOWER SECTION: side foods + "This means" + fact box */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-6 items-start">
                        {/* LEFT: clickable foods */}
                        <div className="space-y-2">
                            <h2 className="text-sm font-semibold mb-2 text-slate-200">
                                Foods on your plate
                            </h2>
                            <div className="flex flex-col gap-2">
                                {backendSummary?.items.map((item) => (
                                    <button
                                        key={item.ingredient_id}
                                        className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition ${
                                            selectedFoodId === item.ingredient_id
                                                ? "bg-[rgb(232,175,149)] text-[rgb(77,59,63)] border-[rgb(232,175,149)]"
                                                : "bg-[rgb(77,59,63)] border-[rgb(232,175,149)] text-slate-100 hover:bg-[rgb(94,73,78)]"
                                        }`}
                                        onClick={() => setSelectedFoodId(item.ingredient_id)}
                                    >
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* CENTER: "This means" + bullets */}
                        <div className="bg-[rgb(77,59,63)] rounded-3xl border border-[rgb(232,175,149)] px-5 py-6 space-y-3">
                            <h2 className="font-playfair text-2xl mb-2">This means:</h2>
                            {backendSummary ? (
                                <ul className="space-y-2 text-sm md:text-base">
                                    <li className="flex gap-2">
                                        <span>★</span>
                                        <span>
                      This plate emits roughly{" "}
                                            <span className="font-semibold">
                        {backendSummary.total_co2_kg.toFixed(2)} kg of CO₂
                      </span>
                      , adding to the gases that warm the planet.
                    </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>★</span>
                                        <span>
                      It uses about{" "}
                                            <span className="font-semibold">
                        {backendSummary.total_freshwater_l.toFixed(1)} liters
                      </span>{" "}
                                            of freshwater — from farm to plate.
                    </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>★</span>
                                        <span>
                      It occupies around{" "}
                                            <span className="font-semibold">
                        {backendSummary.total_land_m2.toFixed(2)} m²
                      </span>{" "}
                                            of land, affecting habitats and ecosystems.
                    </span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>★</span>
                                        <span>
                      Small shifts — like swapping one high-impact item for a
                      lower one — can significantly improve this score.
                    </span>
                                    </li>
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-300">
                                    We don&apos;t have impact data for this plate yet.
                                </p>
                            )}

                            {error && (
                                <p className="text-xs text-red-300 mt-2">
                                    There was a problem talking to the server: {error}
                                </p>
                            )}
                        </div>

                        {/* RIGHT: selected food fact */}
                        <div className="space-y-2">
                            <h2 className="text-sm font-semibold mb-2 text-slate-200">
                                Ingredient spotlight
                            </h2>
                            <div className="bg-[rgb(77,59,63)] rounded-2xl border border-[rgb(232,175,149)] px-4 py-4 text-sm">
                                {backendSummary && backendSummary.items.length > 0 ? (
                                    (() => {
                                        const selected =
                                            backendSummary.items.find(
                                                (item) => item.ingredient_id === selectedFoodId
                                            ) ?? backendSummary.items[0];

                                        const fact =
                                            FOOD_FACTS[selected.name] ??
                                            "This ingredient contributes to your plate’s overall climate, water, and land footprint based on how it’s grown, processed, and transported.";

                                        return (
                                            <>
                                                <p className="font-semibold mb-1">{selected.name}</p>
                                                <p className="text-slate-200 mb-2">
                                                    {selected.quantity_g} g on your plate ·{" "}
                                                    {selected.co2_kg.toFixed(2)} kg CO₂ ·{" "}
                                                    {selected.freshwater_l.toFixed(1)} L water ·{" "}
                                                    {selected.land_m2.toFixed(2)} m² land
                                                </p>
                                                <p className="text-slate-200">{fact}</p>
                                            </>
                                        );
                                    })()
                                ) : (
                                    <p className="text-slate-300">
                                        Click a food on the left to see a quick fact about its
                                        impact.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                        <button
                            className="px-4 py-2 rounded-xl bg-[rgb(181,171,161)] text-[rgb(94,73,78)] font-semibold hover:bg-[rgb(232,175,149)] transition"
                            onClick={handleEditPlate}
                        >
                            ← Edit plate
                        </button>
                        <button
                            className="px-4 py-2 rounded-xl border border-[rgb(232,175,149)] text-slate-100 hover:bg-[rgb(94,73,78)] transition"
                            onClick={handleStartOver}
                        >
                            Start over
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
