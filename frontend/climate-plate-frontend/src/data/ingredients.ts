// src/data/ingredients.ts

export type Ingredient = {
    id: string;
    name: string;
    imageSrc: string;   // path in /public
    plateX: number;     // % from left inside the plate container
    plateY: number;     // % from top inside the plate container
    maxSize: number;    // base width/height in px
};

export const INGREDIENTS: Ingredient[] = [
    {
        id: "bread",
        name: "Bread",
        imageSrc: "/images/bread.png",
        plateX: 40,
        plateY: 55,
        maxSize: 110,
    },
    {
        id: "chicken",
        name: "Chicken",
        imageSrc: "/images/chicken.png",
        plateX: 62,
        plateY: 45,
        maxSize: 120,
    },
];

