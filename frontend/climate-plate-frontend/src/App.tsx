// src/App.tsx

import { useState } from "react";
import { INGREDIENTS } from "./data/ingredients";

type SelectionState = {
    [id: string]: {
        isSelected: boolean;
        grams: number;
    };
};

function App() {
    const [selections, setSelections] = useState<SelectionState>({});

    const handleToggleSelect = (id: string, checked: boolean) => {
        setSelections((prev) => ({
            ...prev,
            [id]: {
                isSelected: checked,
                grams: prev[id]?.grams ?? 50,
            },
        }));
    };

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

    const handleDoneClick = () => {
        const payload = Object.entries(selections)
            .filter(([_, value]) => value.isSelected && value.grams > 0)
            .map(([id, value]) => ({
                id,
                grams: value.grams,
            }));

        console.log("Meal payload for backend:", payload);
        alert("Check console for payload. This is what backend will receive.");
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
            {/* main row */}
            <div className="w-full max-w-5xl bg-slate-800 rounded-3xl shadow-xl p-6 flex gap-6">

                {/* LEFT: plate area */}
                <div className="flex-[3] flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-700">

                    {/* CONTAINER FIX:
                        1. Added specific Width/Height (300px).
                           Without this, 'left: 40%' uses the screen width.
                        2. Added 'relative' to trap absolute children inside.
                    */}
                    <div
                        style={{
                            position: 'relative',
                            width: '300px',
                            height: '300px',
                            margin: '0 auto' // Centers it if flex is broken
                        }}
                    >
                        {/* PLATE IMAGE */}
                        <img
                            src="/images/plate.png"
                            alt="Plate"
                            style={{
                                position: 'relative',
                                zIndex: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                        />

                        {/* INGREDIENTS */}
                        {INGREDIENTS.map((item) => {
                            const current = selections[item.id];
                            if (!current?.isSelected || current.grams <= 0) return null;

                            const minGrams = 50;
                            const maxGrams = 200;
                            const clamped = Math.max(minGrams, Math.min(maxGrams, current.grams));
                            const t = (clamped - minGrams) / (maxGrams - minGrams);
                            const scale = 0.4 + t * 0.7;

                            return (
                                <img
                                    key={item.id}
                                    src={item.imageSrc}
                                    alt={item.name}
                                    style={{
                                        position: 'absolute',
                                        zIndex: 10,

                                        // Now these percentages relate to the 300px box, not the screen
                                        left: `${item.plateX}%`,
                                        top: `${item.plateY}%`,

                                        transform: `translate(-50%, -50%) scale(${scale})`,
                                        width: item.maxSize,
                                        height: item.maxSize,
                                        objectFit: "contain",
                                        pointerEvents: "none"
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: ingredients box */}
                <div className="flex-[2] bg-slate-900/60 rounded-2xl border border-slate-700 p-4 flex flex-col">
                    <h1 className="text-xl font-semibold mb-2">
                        Build your climate plate
                    </h1>
                    <p className="text-sm text-slate-400 mb-4">
                        Select ingredients and adjust grams. The visuals will update on the plate.
                    </p>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {INGREDIENTS.map((item) => {
                            const current = selections[item.id] || { isSelected: false, grams: 50 };

                            return (
                                <div
                                    key={item.id}
                                    className="bg-slate-800 rounded-xl px-3 py-2 flex flex-col gap-2"
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
                                        <span className="text-xs text-slate-400">
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