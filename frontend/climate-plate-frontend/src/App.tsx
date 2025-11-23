// src/App.tsx

import { useState } from "react";
import { INGREDIENTS } from "./data/ingredients";

// This describes the shape of the "selections" state.
// Example:
// {
//   bread:   { isSelected: true,  grams: 150 },
//   chicken: { isSelected: false, grams:  50 },
// }
type SelectionState = {
    [id: string]: {
        isSelected: boolean;
        grams: number;
    };
};

function App() {
    // React state holding which ingredients are selected + their grams
    const [selections, setSelections] = useState<SelectionState>({});

    // Called when a checkbox is toggled (true/false)
    const handleToggleSelect = (id: string, checked: boolean) => {
        setSelections((prev) => ({
            // keep all other ingredients exactly as they were
            ...prev,
            [id]: {
                isSelected: checked,
                // if we already had a grams value for this ingredient, keep it;
                // otherwise default to 50g so the slider isn't at 0
                grams: prev[id]?.grams ?? 50,
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
    const handleDoneClick = () => {
        // Convert selections object into a clean array for the backend:
        // 1. Only keep ingredients with isSelected === true AND grams > 0
        // 2. Map to { id, grams }
        const payload = Object.entries(selections)
            .filter(([_, value]) => value.isSelected && value.grams > 0)
            .map(([id, value]) => ({
                id,
                grams: value.grams,
            }));

        console.log("Meal payload for backend:", payload);
        alert("Check console for payload. This is what backend will receive.");
        // Later: replace alert + console.log with an API call to your backend
    };

    return (
        // Full-screen container: dark background, center content
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
            {/* Main row: plate on the left, ingredients box on the right.
          max-w-5xl: keeps content from stretching too wide on big screens */}
            <div className="w-full max-w-5xl flex gap-10 items-center">
                {/* LEFT: plate area (NO inner box, just floating on background) */}
                <div className="flex-[3] flex items-center justify-center">
                    {/* Plate + ingredient overlay live in this responsive square container.
              - width: 100% of its column
              - maxWidth: cap so it's not massive on large screens
              - aspectRatio: "1 / 1" keeps it perfectly square */}
                    <div
                        style={{
                            position: "relative",       // so children with position:absolute are relative to this box
                            width: "100%",
                            maxWidth: "380px",          // tweak this to make the plate bigger/smaller overall
                            aspectRatio: "1 / 1",       // square; remove if you want it to be taller/wider
                            margin: "0 auto",           // center inside its flex column
                        }}
                    >
                        {/* PLATE IMAGE — just fills the container */}
                        <img
                            src="/images/plate.png"
                            alt="Plate"
                            style={{
                                position: "relative",     // sits at zIndex 0, ingredients go above
                                zIndex: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",     // keep plate aspect ratio
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
                            const clamped = Math.max(minGrams, Math.min(maxGrams, current.grams));
                            const t = (clamped - minGrams) / (maxGrams - minGrams); // normalized 0–1
                            const scale = 0.4 + t * 0.7; // final range: 0.4–1.1 (roughly)

                            return (
                                <img
                                    key={item.id}
                                    src={item.imageSrc}
                                    alt={item.name}
                                    style={{
                                        position: "absolute",
                                        zIndex: 10, // above the plate
                                        // plateX / plateY are percentages (0–100) of this container.
                                        // 50,50 would be dead center of the plate.
                                        left: `${item.plateX}%`,
                                        top: `${item.plateY}%`,
                                        // translate(-50%, -50%) moves the image so its center is at (left, top)
                                        // scale(...) grows/shrinks based on grams
                                        transform: `translate(-50%, -50%) scale(${scale})`,
                                        width: item.maxSize,   // base size; actual size = base * scale
                                        height: item.maxSize,
                                        objectFit: "contain",  // keep food aspect ratio
                                        pointerEvents: "none", // clicks pass through to sliders/checkboxes
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: ingredients panel (inside its own box) */}
                <div className="flex-[2] bg-slate-900/60 rounded-2xl border border-slate-700 p-4 flex flex-col">
                    <h1 className="text-xl font-semibold mb-2">
                        Build your climate plate
                    </h1>

                    <p className="text-sm text-slate-400 mb-4">
                        Select ingredients and adjust grams. The visuals will update on the
                        plate.
                    </p>

                    {/* Scrollable list section in case you add many ingredients later */}
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {INGREDIENTS.map((item) => {
                            // If this ingredient has never been touched, default to unchecked + 50g
                            const current =
                                selections[item.id] || ({ isSelected: false, grams: 50 } as const);

                            return (
                                <div
                                    key={item.id}
                                    className="bg-slate-800 rounded-xl px-3 py-2 flex flex-col gap-2"
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

                                        <span className="text-xs text-slate-400">
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

                    {/* Submit button – later this will send a real request to the backend */}
                    <button
                        className="mt-4 w-full py-2 rounded-xl bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition"
                        onClick={handleDoneClick}
                    >
                        Done – calculate impact
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
