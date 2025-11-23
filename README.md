# 🍽️ Dinner & CO₂ Emissions

_A full-stack tool to calculate the environmental impact of your dinner plate._

Dinner & CO₂ Emissions lets users build a dinner plate from common ingredients and instantly see its **carbon footprint**, **freshwater usage**, and **land use**, based on real-world food production data. It combines a **FastAPI backend** with a **React + TypeScript + Vite + Tailwind** frontend.

Built for a **Data Science for Social Good** hackathon.

---

## 🌍 Why this exists

Food production is responsible for a significant share of global greenhouse gas emissions.  
But most people have no idea how much CO₂ their everyday meals emit — especially at the **dinner plate** level.

Our goal is to make climate impact:
- **Visible** – in actual numbers (kg CO₂e, liters of water, m² of land)  
- **Understandable** – ingredient by ingredient  
- **Actionable** – with the ability to tweak portions and see the effect immediately  

---

## 🧱 Architecture Overview

```txt
               ┌─────────────────────────────┐
               │       React Frontend        │
               │   (Vite + TS + Tailwind)    │
               │  src/main.tsx, src/App.tsx  │
               └─────────────┬──────────────┘
                             │ HTTP (JSON)
                             ▼
               ┌─────────────────────────────┐
               │         FastAPI API         │
               │   main.py                   │
               │   /ingredients              │
               │   /session, /plate          │
               │   /impact, /impact/explain  │
               └─────────────┬──────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────────┐
          │           Services & Models             │
          │ ingredient_service.py / ingredients.py  │
          │ plate_service.py / plate.py            │
          │ impact_service.py / impact.py          │
          └─────────────┬──────────────────────────┘
                        │
                        ▼
          ┌──────────────────────────────────────────┐
          │   Data & Pipeline                        │
          │ Food_Production.csv                      │
          │ generate_ingredients_json.py             │
          │ ingredients.json                         │
          └──────────────────────────────────────────┘
```

# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn main:app --reload

# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev

