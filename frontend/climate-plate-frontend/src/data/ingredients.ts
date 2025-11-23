// src/data/ingredients.ts

export type Ingredient = {
    id: string;        // unique ID used in state and payload (e.g. "bread")
    name: string;      // human-readable label for the UI
    imageSrc: string;  // path under /public (e.g. "/images/bread.png")
    plateX: number;    // X position on plate container in %, 0–100 (50 is middle horizontally)
    plateY: number;    // Y position on plate container in %, 0–100 (50 is middle vertically)
    maxSize: number;   // base width/height in px before scaling by grams
};

export const INGREDIENTS: Ingredient[] = [
    {
        id: "bread",
        name: "Bread",
        imageSrc: "/images/bread.png",
        plateX: 40,   // a bit left of center
        plateY: 55,   // slightly lower than center
        maxSize: 110, // base size of the bread image on the plate
    },
    {
        id: "chicken",
        name: "Chicken",
        imageSrc: "/images/chicken.png",
        plateX: 62,   // a bit right of center
        plateY: 45,   // slightly above the bread
        maxSize: 120,
    },
];
