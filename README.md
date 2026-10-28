# Geospatial Sustainability Compliance Lab

Collaborative feasibility study and innovation sprint repository developed within the **geoInnovation:lab** at the **Department of Geoinformatics (Z_GIS), University of Salzburg (PLUS)** in collaboration with Kharkiv University.

## 🎯 Objective
Rapid prototyping and demonstrator development ("mockup / demonstrator over text") translating Earth observation, GeoAI, and geospatial analytics into practical solutions for regional industry partners and sustainability compliance.

---

## 📁 Repository Structure
```text
├── app/                  # Interactive demonstrators & dashboards (Streamlit / MapLibre)
│   └── main.py
├── data/
│   ├── raw/              # Raw spatial datasets, vector boundaries, satellite imagery
│   ├── processed/        # Processed rasters, analytical layers, features
│   └── samples/          # Test/demo GeoJSONs, shapefiles
├── notebooks/            # Exploratory analysis & EO pipelines
├── src/                  # Production & pipeline modules
│   ├── analytics/        # EO metrics, change detection, compliance logic
│   └── utils/            # Helper utilities and data loaders
├── docs/                 # Sprint briefs, specifications, meeting notes
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 🚀 Quickstart

### 1. Environment Setup
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Run the Demonstrator
```bash
streamlit run app/main.py
```
