from pathlib import Path
import json
import pandas as pd


FOODS_TO_KEEP = [
    "Wheat & Rye (Bread)",
    "Barley (Beer)",
    "Rice",
    "Potatoes",
    "Peas",
    "Bananas",
    "Apples",
    "Wine",
    "Coffee",
    "Lamb & Mutton",
    "Pig Meat",
    "Poultry Meat",
    "Cheese",
    "Eggs",
    "Fish (farmed)",
    "Beef (beef herd)",
]

DEFAULT_PORTIONS = {
    "Wheat & Rye (Bread)": 100,
    "Barley (Beer)": 250,
    "Rice": 100,
    "Potatoes": 100,
    "Peas": 100,
    "Bananas": 100,
    "Apples": 100,
    "Wine": 250,
    "Coffee": 250,
    "Lamb & Mutton": 150,
    "Pig Meat": 150,
    "Poultry Meat": 150,
    "Cheese": 100,
    "Eggs": 100,
    "Fish (farmed)": 150,
    "Beef (beef herd)": 150,
}

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

INPUT_CSV = DATA_DIR / "Food_Production.csv"
OUTPUT_JSON = DATA_DIR / "ingredients.json"


def slugify(name: str) -> str:
    return (
        name.lower()
        .replace("&", "and")
        .replace("(", "")
        .replace(")", "")
        .replace("/", " ")
        .replace(",", "")
        .strip()
        .replace("  ", " ")
        .replace(" ", "_")
    )


def format_float(value, decimals=1):
    """Format floats cleanly (e.g., 2248.3999 → 2248.4)."""
    if pd.isna(value):
        return None
    return round(float(value), decimals)


def define_category(name: str) -> str:
    if any(x in name for x in ["Beef", "Lamb", "Pig", "Poultry", "Fish"]):
        return "meat"
    if name in ["Coffee", "Wine", "Barley (Beer)"]:
        return "drink"
    if name in ["Apples", "Bananas"]:
        return "fruit"
    return "plant"


def main():
    print(f"Reading CSV from: {INPUT_CSV}")
    df = pd.read_csv(INPUT_CSV)

    # Filter down to the 16 foods
    df = df[df["Food product"].isin(FOODS_TO_KEEP)].copy()

    # Compute medians for missing environmental metrics
    land_median = df["Land use per kilogram (m² per kilogram)"].median()
    freshwater_median = df["Freshwater withdrawals per kilogram (liters per kilogram)"].median()
    scarcity_median = df["Scarcity-weighted water use per kilogram (liters per kilogram)"].median()

    print("Medians used for missing values:")
    print(f"  land: {land_median:.2f}")
    print(f"  freshwater: {freshwater_median:.2f}")
    print(f"  scarcity water: {scarcity_median:.2f}")

    # Replace missing with medians
    df["Land use per kilogram (m² per kilogram)"] = df[
        "Land use per kilogram (m² per kilogram)"
    ].fillna(land_median)

    df["Freshwater withdrawals per kilogram (liters per kilogram)"] = df[
        "Freshwater withdrawals per kilogram (liters per kilogram)"
    ].fillna(freshwater_median)

    df["Scarcity-weighted water use per kilogram (liters per kilogram)"] = df[
        "Scarcity-weighted water use per kilogram (liters per kilogram)"
    ].fillna(scarcity_median)


    # Add slug and formatted fields
    df["slug"] = df["Food product"].apply(slugify)

    df["co2_kg_per_kg"] = df["Total_emissions"].apply(lambda x: format_float(x, 1))
    df["land_m2_per_kg"] = df["Land use per kilogram (m² per kilogram)"].apply(lambda x: format_float(x, 2))
    df["freshwater_l_per_kg"] = df["Freshwater withdrawals per kilogram (liters per kilogram)"].apply(lambda x: format_float(x, 1))
    df["scarcity_water_l_per_kg"] = df["Scarcity-weighted water use per kilogram (liters per kilogram)"].apply(lambda x: format_float(x, 1))

    df["default_portion_g"] = df["Food product"].map(DEFAULT_PORTIONS)
    df["category"] = df["Food product"].apply(define_category)

    # Convert to list of dicts
    records = []
    for idx, row in df.reset_index(drop=True).iterrows():
        records.append(
            {
                "id": idx + 1,
                "slug": row["slug"],
                "name": row["Food product"],
                "category": row["category"],
                "co2_kg_per_kg": row["co2_kg_per_kg"],
                "land_m2_per_kg": row["land_m2_per_kg"],
                "freshwater_l_per_kg": row["freshwater_l_per_kg"],
                "scarcity_water_l_per_kg": row["scarcity_water_l_per_kg"],
                "default_portion_g": int(row["default_portion_g"]),
            }
        )

    print(f"Writing {len(records)} items → {OUTPUT_JSON}")
    OUTPUT_JSON.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print("Done! Missing values replaced with medians & data cleaned.")


if __name__ == "__main__":
    main()
