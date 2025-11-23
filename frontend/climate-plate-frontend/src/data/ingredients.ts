// src/data/ingredients.ts

export type Ingredient = {
    id: string;        // unique ID used in state and payload (e.g. "bread")
    name: string;      // human-readable label for the UI
    imageSrc: string;  // path under /public (e.g. "/images/bread.png")
    plateX: number;    // X position on plate container in %, 0–100 (50 is middle horizontally)
    plateY: number;    // Y position on plate container in %, 0–100 (50 is middle vertically)
    maxSize: number;   // base width/height in px before scaling by grams
    rotation?: number;
    backendId: number;

};

export const INGREDIENTS: Ingredient[] = [
    {
        id: "bread",
        name: "Bread",
        imageSrc: "/images/bread.png",
        plateX: 85,   // a bit left of center
        plateY: 35,   // slightly lower than center
        maxSize: 160, // base size of the bread image on the plate
        rotation: 5, // slight rotation for visual effect
        backendId: 1,
    },
    {
        id: "chicken",
        name: "Chicken",
        imageSrc: "/images/chicken.png",
        plateX: 30,   // a bit right of center
        plateY: 67,   // slightly above the bread
        maxSize: 155,
        rotation: 20,
        backendId: 13,
    },
    {
        id: "beef",
        name: "Beef",
        imageSrc: "/images/beef.png",
        plateX: 40,
        plateY: 43,
        maxSize: 132,
        rotation: 0,
        backendId: 10,
    },
    {
        id: "potatoes",
        name: "Potatoes",
        imageSrc: "/images/potatoes.png",
        plateX: 60,
        plateY: 73,
        maxSize: 150,
        rotation: -5,
        backendId: 4,
    },
    {
        id: "peas",
        name: "Peas",
        imageSrc: "/images/peas.png",
        plateX: 60,
        plateY: 55,
        maxSize: 110,
        rotation: -5,
        backendId: 5,
    },
    {
        id: "rice",
        name: "Rice",
        imageSrc: "/images/rice.png",
        plateX: 60,
        plateY: 25,
        maxSize: 170,
        rotation: 0,
        backendId: 3,
    },
    {
        id: "fish",
        name: "Fish",
        imageSrc: "/images/fish.png",
        plateX: 25,
        plateY: 30,
        maxSize: 140,
        rotation: 0,
        backendId: 16,
    },
    {
        id: "eggs",
        name: "Eggs",
        imageSrc: "/images/eggs.png",
        plateX: 10,
        plateY: 0,
        maxSize: 180,
        rotation: -30,
        backendId: 15,
    },
];
