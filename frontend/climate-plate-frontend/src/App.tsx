// src/App.tsx
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

// Local summary type for the results page (no backend needed yet)
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


function App() {
    // React state holding which ingredients are selected + their grams
    const [selections, setSelections] = useState<SelectionState>({});

    // Which page we’re on
    const [view, setView] = useState<View>("build");

    // Local summary for the results page
    const [summary, setSummary] = useState<LocalResultSummary | null>(null);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [backendSummary, setBackendSummary] = useState<BackendPlateSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    // For now: make a local summary + switch to results page
    // Called when the "Done – calculate impact" button is clicked
    const handleDoneClick = async () => {
        setError(null);
        setIsLoading(true);

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
        setSummary({ totalGrams, items }); // keep local summary for UI

        try {
            // 2) Ensure we have a session from the backend
            let currentSessionId = sessionId;

            if (!currentSessionId) {
                const res = await fetch(`${BASE_URL}/session/start`, {
                    method: "POST",
                });

                if (!res.ok) {
                    throw new Error(`Failed to start session: ${res.status}`);
                }

                const data = await res.json();
                currentSessionId = data.session_id;
                setSessionId(currentSessionId);
            }

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
                            currentSessionId!
                        )}&ingredient_id=${item.backendId}&quantity_g=${item.grams}`,
                        { method: "POST" }
                    )
                )
            );

            // 4) Fetch the summary for this session
            const summaryRes = await fetch(
                `${BASE_URL}/impact/summary?session_id=${encodeURIComponent(
                    currentSessionId!
                )}`
            );

            if (!summaryRes.ok) {
                throw new Error(`Failed to fetch summary: ${summaryRes.status}`);
            }

            const backendData: BackendPlateSummary = await summaryRes.json();
            setBackendSummary(backendData);
        } catch (err: any) {
            console.error("Error talking to backend:", err);
            setError(err?.message ?? "Unknown error talking to backend.");
        } finally {
            setIsLoading(false);
            // Switch to results screen whether backend succeeded or not
            setView("results");
        }
    };


    // Simple helper to reset and go back to builder
    const handleEditPlate = () => {
        setView("build");
    };

    const handleStartOver = () => {
        setSelections({});
        setSummary(null);
        setView("build");
    };

    return (
        // Full-screen container: dark background, center content
        <div className="min-h-screen bg-[rgb(41,31,33)] text-slate-100 flex items-center justify-center px-4">
            {view === "build" ? (
                // 🥗 BUILD VIEW (your original layout)
                <div className="w-full max-w-5xl flex gap-10 items-center">
                    {/* LEFT: plate area (NO inner box, just floating on background) */}
                    <div className="flex-[3] flex items-center justify-center">
                        {/* Plate + ingredient overlay live in this responsive square container. */}
                        <div
                            style={{
                                position: "relative", // so children with position:absolute are relative to this box
                                width: "100%",
                                maxWidth: "520px", // tweak this to make the plate bigger/smaller overall
                                aspectRatio: "1 / 1", // square; remove if you want it to be taller/wider
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

                                // Compute visual scale based on grams.
                                // Here we clamp between 50g and 200g so the size doesn't explode.
                                const minGrams = 50;
                                const maxGrams = 200;
                                const clamped = Math.max(
                                    minGrams,
                                    Math.min(maxGrams, current.grams)
                                );
                                const t = (clamped - minGrams) / (maxGrams - minGrams); // normalized 0–1
                                const scale = 0.9 + t * 0.35; // final range: 0.9–1.25-ish

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
                            Done – calculate impact
                        </button>
                    </div>
                </div>
            ) : (
                // 🌍 RESULTS VIEW (second page)
                <div className="w-full max-w-3xl bg-[rgb(77,59,63)] rounded-3xl border border-[rgb(232,175,149)] p-6 md:p-8 flex flex-col gap-4">
                    <h1 className="font-playfair text-4xl mb-2">
                        Your Climate Plate Summary
                    </h1>

                    {summary ? (
                        <>
                            <p className="text-sm text-slate-200 mb-2">
                                You built a plate with{" "}
                                <span className="font-semibold">
        {summary.items.length} ingredient
                                    {summary.items.length > 1 ? "s" : ""}
      </span>{" "}
                                totaling{" "}
                                <span className="font-semibold">
        {summary.totalGrams} grams
      </span>
                                .
                            </p>

                            <div className="bg-[#4D3B3F] rounded-2xl p-4 space-y-2">
                                {summary.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span>{item.name}</span>
                                        <span className="text-slate-200">{item.grams} g</span>
                                    </div>
                                ))}
                            </div>

                            {/* Backend data, if we got it */}
                            {isLoading && (
                                <p className="text-sm text-slate-300 mt-4">
                                    Calculating climate impact...
                                </p>
                            )}

                            {error && (
                                <p className="text-sm text-red-300 mt-4">
                                    Error fetching impact data: {error}
                                </p>
                            )}

                            {backendSummary && !isLoading && !error && (
                                <div className="mt-6 space-y-3">
                                    <h2 className="font-playfair text-2xl">
                                        Climate Impact (from backend)
                                    </h2>
                                    <div className="bg-[#4D3B3F] rounded-2xl p-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Total CO₂ emissions</span>
                                            <span className="font-semibold">
              {backendSummary.total_co2_kg.toFixed(2)} kg
            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total freshwater use</span>
                                            <span className="font-semibold">
              {backendSummary.total_freshwater_l.toFixed(1)} L
            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total land use</span>
                                            <span className="font-semibold">
              {backendSummary.total_land_m2.toFixed(2)} m²
            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Impact score</span>
                                            <span className="font-semibold">
              {backendSummary.impact_score_1_to_10.toFixed(1)} / 10
            </span>
                                        </div>
                                    </div>

                                    {/* Optional: per-ingredient backend breakdown */}
                                    <div className="bg-[#4D3B3F] rounded-2xl p-4 space-y-2 text-sm">
                                        <h3 className="font-semibold mb-2">Per-ingredient impact</h3>
                                        {backendSummary.items.map((item) => (
                                            <div
                                                key={item.ingredient_id}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                                            >
                                                <span>{item.name}</span>
                                                <span className="text-slate-200">
                {item.quantity_g} g · {item.co2_kg.toFixed(2)} kg CO₂ ·{" "}
                                                    {item.freshwater_l.toFixed(1)} L water ·{" "}
                                                    {item.land_m2.toFixed(2)} m² land
              </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!backendSummary && !isLoading && !error && (
                                <p className="text-sm text-slate-300 mt-4">
                                    Emissions, water use, and land impact will appear here once the backend
                                    is fully wired. For now you can still tweak your plate and explore
                                    different combinations.
                                </p>
                            )}
                        </>
                    ) : (
                        <p>No summary available. Try building a plate first.</p>
                    )}


                    <div className="mt-6 flex gap-3">
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
