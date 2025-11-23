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

// ---------- COLOR HELPERS ----------
const getCo2Class = (co2: number | null | undefined) => {
    if (co2 == null) return "bg-[rgb(77,59,63)]";
    if (co2 <= 2) return "bg-green-600";
    if (co2 <= 5) return "bg-yellow-500";
    return "bg-red-600";
};

const getWaterClass = (water: number | null | undefined) => {
    if (water == null) return "bg-[rgb(77,59,63)]";
    if (water <= 100) return "bg-green-600";
    if (water <= 700) return "bg-yellow-500";
    return "bg-red-600";
};

const getLandClass = (land: number | null | undefined) => {
    if (land == null) return "bg-[rgb(77,59,63)]";
    if (land <= 5) return "bg-green-600";
    if (land <= 20) return "bg-yellow-500";
    return "bg-red-600";
};

function App() {
    // React state holding which ingredients are selected + their grams
    const [selections, setSelections] = useState<SelectionState>({});

    // Which page we’re on
    const [view, setView] = useState<View>("build");

    // Local summary for the results page
    const [summary, setSummary] = useState<LocalResultSummary | null>(null);

    // Backend state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [backendSummary, setBackendSummary] =
        useState<BackendPlateSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Which food is selected in the results "spotlight"
    const [selectedFoodId, setSelectedFoodId] = useState<number | null>(null);

    // Which slide of the carousel we're on: 0 = impact boxes, 1 = this means, 2 = Gemini
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    const handlePrevSlide = () => {
        setActiveSlideIndex((prev) => (prev + 2) % 3);
    };

    const handleNextSlide = () => {
        setActiveSlideIndex((prev) => (prev + 1) % 3);
    };

    // Called when a checkbox is toggled (true/false)
    const handleToggleSelect = (id: string, checked: boolean) => {
        setSelections((prev) => ({
            ...prev,
            [id]: {
                isSelected: checked,
                grams: prev[id]?.grams ?? 125,
            },
        }));
    };

    // Called when the slider for an ingredient moves
    const handleGramsChange = (id: string, gramsValue: string) => {
        const grams = Number(gramsValue) || 0;

        setSelections((prev) => ({
            ...prev,
            [id]: {
                isSelected: prev[id]?.isSelected ?? false,
                grams,
            },
        }));
    };

    const handleDoneClick = async () => {
        setError(null);
        setIsLoading(true);
        setBackendSummary(null);

        const items: ResultItem[] = Object.entries(selections)
            .filter(([_, value]) => value.isSelected && value.grams > 0)
            .map(([id, value]) => {
                const ingredient = INGREDIENTS.find((ing) => ing.id === id);
                if (!ingredient) return null;

                return { id, name: ingredient.name, grams: value.grams };
            })
            .filter((x): x is ResultItem => x !== null);

        if (items.length === 0) {
            setIsLoading(false);
            alert("Pick at least one ingredient first.");
            return;
        }

        setSummary({
            totalGrams: items.reduce((sum, item) => sum + item.grams, 0),
            items,
        });

        try {
            const res = await fetch(`${BASE_URL}/session/start`, { method: "POST" });
            if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);

            const data = await res.json();
            const currentSessionId = data.session_id as string;
            setSessionId(currentSessionId);

            const selectedForBackend = items
                .map((item) => {
                    const ingredient = INGREDIENTS.find((ing) => ing.id === item.id);
                    if (!ingredient) return null;
                    return { backendId: ingredient.backendId, grams: item.grams };
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

            const summaryRes = await fetch(
                `${BASE_URL}/impact/summary?session_id=${encodeURIComponent(
                    currentSessionId
                )}`
            );
            if (!summaryRes.ok)
                throw new Error(`Failed to fetch summary: ${summaryRes.status}`);

            const backendData: BackendPlateSummary = await summaryRes.json();
            setBackendSummary(backendData);

            if (backendData.items.length > 0)
                setSelectedFoodId(backendData.items[0].ingredient_id);
        } catch (err: any) {
            console.error("Error talking to backend:", err);
            setError(err?.message ?? "Unknown error talking to backend.");
        } finally {
            setIsLoading(false);
            setView("results");
        }
    };

    const handleEditPlate = () => {
        setView("build");
    };

    const handleStartOver = () => {
        setSelections({});
        setSummary(null);
        setBackendSummary(null);
        setSessionId(null);
        setSelectedFoodId(null);
        setError(null);
        setIsLoading(false);
        setView("build");
        setActiveSlideIndex(0);
    };

    return (
        <div className="min-h-screen bg-[rgb(41,31,33)] text-slate-100 flex items-center justify-center px-4">
            {view === "build" ? (
                // ---------------- BUILD VIEW ----------------
                <div className="w-full max-w-5xl flex gap-10 items-center">
                    {/* LEFT: PLATE */}
                    <div className="flex-[3] flex items-center justify-center">
                        <div
                            style={{
                                position: "relative",
                                width: "100%",
                                maxWidth: "520px",
                                aspectRatio: "1 / 1",
                                margin: "0 auto",
                            }}
                        >
                            <img
                                src="/images/plate.png"
                                alt="Plate"
                                draggable={false}
                                style={{
                                    position: "relative",
                                    zIndex: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                }}
                            />

                            {INGREDIENTS.map((item) => {
                                const current = selections[item.id];
                                if (!current?.isSelected || current.grams <= 0) return null;

                                const minGrams = 50;
                                const maxGrams = 200;
                                const clamped = Math.max(
                                    minGrams,
                                    Math.min(maxGrams, current.grams)
                                );
                                const t = (clamped - minGrams) / (maxGrams - minGrams);
                                const scale = 0.9 + t * 0.35;

                                return (
                                    <img
                                        key={item.id}
                                        src={item.imageSrc}
                                        alt={item.name}
                                        draggable={false}
                                        style={{
                                            position: "absolute",
                                            zIndex: 10,
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

                    {/* RIGHT: INGREDIENTS */}
                    <div className="flex-[3] bg-[rgb(77,59,63)] rounded-2xl border border-[rgb(232,175,149)] p-4 flex flex-col">
                        <h1 className="font-playfair text-4xl mb-2">
                            Build Your Climate Plate
                        </h1>

                        <p className="text-sm text-slate-300 mb-4">
                            Choose your ingredients and adjust the sliders to match your meal.
                        </p>

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
                // ---------------- RESULTS VIEW ----------------
                <div className="w-full max-w-6xl bg-[rgb(41,31,33)] text-slate-100 flex flex-col gap-6">
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

                    {/* --- 3-PAGE CAROUSEL, FIXED HEIGHT, ARROWS UNDER --- */}
                    <div className="mt-4 max-w-5xl mx-auto flex flex-col items-stretch gap-3">
                        {backendSummary ? (
                            <>
                                {/* SLIDE AREA WITH FIXED HEIGHT */}
                                <div className="w-full h-[260px]">
                                    <div className="w-full h-full flex">
                                        {(() => {
                                            // Slide 0: Impact Boxes
                                            if (activeSlideIndex === 0) {
                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full h-full items-center">
                                                        <div
                                                            className={`rounded-2xl border border-[rgb(232,175,149)] px-4 py-5 flex flex-col items-center text-slate-100 ${getCo2Class(
                                                                backendSummary.total_co2_kg
                                                            )}`}
                                                        >
                              <span className="text-xs uppercase tracking-wide text-slate-200 mb-1">
                                CO₂ cost
                              </span>
                                                            <span className="text-2xl font-semibold">
                                {backendSummary.total_co2_kg.toFixed(2)} kg
                              </span>
                                                        </div>

                                                        <div
                                                            className={`rounded-2xl border border-[rgb(232,175,149)] px-4 py-5 flex flex-col items-center text-slate-100 ${getWaterClass(
                                                                backendSummary.total_freshwater_l
                                                            )}`}
                                                        >
                              <span className="text-xs uppercase tracking-wide text-slate-200 mb-1">
                                Water usage
                              </span>
                                                            <span className="text-2xl font-semibold">
                                {backendSummary.total_freshwater_l.toFixed(1)} L
                              </span>
                                                        </div>

                                                        <div
                                                            className={`rounded-2xl border border-[rgb(232,175,149)] px-4 py-5 flex flex-col items-center text-slate-100 ${getLandClass(
                                                                backendSummary.total_land_m2
                                                            )}`}
                                                        >
                              <span className="text-xs uppercase tracking-wide text-slate-200 mb-1">
                                Land usage
                              </span>
                                                            <span className="text-2xl font-semibold">
                                {backendSummary.total_land_m2.toFixed(2)} m²
                              </span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Slide 1: "This Means"
                                            if (activeSlideIndex === 1) {
                                                return (
                                                    <div className="bg-[rgb(77,59,63)] rounded-3xl border border-[rgb(232,175,149)] px-5 py-6 space-y-3 w-full h-full flex flex-col justify-center">
                                                        <h2 className="font-playfair text-2xl mb-2">
                                                            This means:
                                                        </h2>
                                                        <ul className="space-y-2 text-sm md:text-base">
                                                            <li className="flex gap-2">
                                                                <span>★</span>
                                                                <span>
                                  This plate emits{" "}
                                                                    <span className="font-semibold">
                                    {backendSummary.total_co2_kg.toFixed(2)} kg
                                    CO₂
                                  </span>
                                  .
                                </span>
                                                            </li>

                                                            <li className="flex gap-2">
                                                                <span>★</span>
                                                                <span>
                                  It uses{" "}
                                                                    <span className="font-semibold">
                                    {backendSummary.total_freshwater_l.toFixed(
                                        1
                                    )}{" "}
                                                                        L
                                  </span>{" "}
                                                                    of freshwater.
                                </span>
                                                            </li>

                                                            <li className="flex gap-2">
                                                                <span>★</span>
                                                                <span>
                                  It requires{" "}
                                                                    <span className="font-semibold">
                                    {backendSummary.total_land_m2.toFixed(2)}{" "}
                                                                        m²
                                  </span>{" "}
                                                                    of land.
                                </span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                );
                                            }

                                            // Slide 2: Gemini Insights
                                            return (
                                                <div className="bg-[rgb(124,109,108)] rounded-3xl border border-[rgb(232,175,149)] px-5 py-6 space-y-3 w-full h-full flex flex-col justify-center">
                                                    <h2 className="font-playfair text-2xl mb-2">
                                                        Gemini Insights
                                                    </h2>
                                                    <p className="text-sm md:text-base text-slate-100">
                                                        Soon, this box will use Gemini to suggest
                                                        lower-impact alternatives based on your exact plate.
                                                    </p>
                                                    <ul className="list-disc list-inside text-sm md:text-base text-slate-100 space-y-1">
                                                        <li>
                                                            Swap a high-impact ingredient for a lower one.
                                                        </li>
                                                        <li>
                                                            Show how portion adjustments change your score.
                                                        </li>
                                                        <li>
                                                            Compare your plate to a more sustainable version.
                                                        </li>
                                                    </ul>
                                                    <p className="text-xs text-slate-200 mt-2">
                                                        (This will come from the Gemini API.)
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* ARROWS + DOTS UNDER, FIXED POSITION */}
                                <div className="flex justify-center items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={handlePrevSlide}
                                        className="h-9 px-3 flex items-center justify-center rounded-full border border-[rgb(232,175,149)] hover:bg-[rgb(94,73,78)] text-sm"
                                    >
                                        ←
                                    </button>

                                    <div className="flex gap-2">
                                        {[0, 1, 2].map((idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setActiveSlideIndex(idx)}
                                                className={`h-2.5 w-2.5 rounded-full transition ${
                                                    idx === activeSlideIndex
                                                        ? "bg-slate-100"
                                                        : "bg-slate-500 opacity-60"
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleNextSlide}
                                        className="h-9 px-3 flex items-center justify-center rounded-full border border-[rgb(232,175,149)] hover:bg-[rgb(94,73,78)] text-sm"
                                    >
                                        →
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="bg-[rgb(77,59,63)] rounded-2xl border border-[rgb(232,175,149)] px-4 py-5 flex flex-col items-center text-slate-100 w-full">
                <span className="text-xs uppercase tracking-wide text-slate-300 mb-1">
                  Impact
                </span>
                                <span className="text-2xl font-semibold">–</span>
                            </div>
                        )}
                    </div>

                    {/* LOWER SECTION: side foods + ingredient spotlight */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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

                        {/* RIGHT: spotlight */}
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
                                            "This ingredient contributes to your plate’s overall impact.";

                                        return (
                                            <>
                                                <p className="font-semibold mb-1">{selected.name}</p>
                                                <p className="text-slate-200 mb-2">
                                                    {selected.quantity_g} g ·{" "}
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
                                        Click a food on the left to see info.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
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
