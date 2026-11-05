# Ukraine Reconstruction Geodata Readiness & Decision Support Platform

**geoInnovation:lab+** pilot study and decision-support prototype developed at the **Department of Geoinformatics (Z_GIS), Paris Lodron University of Salzburg (PLUS)** in collaboration with **O. M. Beketov National University of Urban Economy in Kharkiv, Ukraine**.

---

## 🎯 Project Overview & Mission

Post-war reconstruction in Ukraine requires reliable, spatially explicit, and interoperable information on damaged buildings, social infrastructure, and territorial recovery needs. While substantial data exists across Ukrainian government registries, international satellite services, and verified open-source intelligence, sources differ substantially in spatial detail, update currency, access conditions, and verification status.

This platform bridges the gap from **"damage documentation"** to **"reconstruction & investment decision support"**—investigating how status-quo damage intelligence can be harmonized with municipal planning, energy resilience, and public investment pipelines (such as DREAM and ONOVA GIS) for Austrian and European reconstruction partners.

### 🛡️ Core Ethics & Scope Principles
- **Strictly Civilian & Reconstruction-Oriented:** All military-tagged events and sensitive operational data are programmatically excluded at the pipeline level.
- **Legitimately Public Data:** Integrates only verified open datasets, research-based models, and official open-data specifications.

---

## 🏛️ Multi-Tiered Data Architecture

1. **Pillar 1: Verified Civilian Infrastructure Harm (National Macro Scale)**
   - *Source:* Bellingcat / Centre for Information Resilience (CIR – *Eyes on Russia* / Forensic Architecture).
   - *Coverage:* ~2,400 verified civilian events across Ukraine (2022–2025) categorized by primary sector (Housing, Healthcare, Schools, Commercial, Roads & Transport).
   - *Clustering & Analytics:* Dynamic MapLibre GL JS clustering, time-series distribution, and spatial filters.

2. **Pillar 2: Building-Level Damage Ground Truth (Local VHR Satellite Scale)**
   - *Source:* UNITAR / UNOSAT Rapid Damage Building Assessment (Code: `CE20220223UKR`).
   - *Coverage:* 520 assessed building footprints in Northern Kharkiv / North Saltivka using VHR commercial satellite imagery (WorldView / Pleiades).
   - *Damage Grading:* Standardized UN damage categories (*Destroyed*, *Severe Damage*, *Moderate Damage*, *Possible Damage*, *Impact Crater*).

3. **Pillar 3: Administrative & Urban District Geometries (Spatial Joins)**
   - *Source:* OpenStreetMap / State Administrative Boundaries.
   - *Coverage:* Sovereign Ukraine national border, Kharkiv Oblast perimeter, and all **9 Urban Districts (Raions)** of Kharkiv City (*Kyivskyi, Saltivskyi, Shevchenkivskyi, Nemyshlianskyi, Osnovianskyi, Slobidskyi, Industrialnyi, Novobavarskyi, Kholodnohirskyi*).
   - *Spatial Join:* Strict Point-in-Polygon (PIP) spatial joins calculating housing damage, social infrastructure burden, and composite **Recovery Priority Tiers** (*Critical*, *High*, *Moderate*, *Baseline*).

---

## 💻 Tech Stack

- **Frontend & Web Mapping:** React 18, Vite, MapLibre GL JS, Tailwind CSS, Lucide Icons.
- **Cartography & Basemaps:** Esri VHR World Imagery (Satellite Hybrid), World Street Map, Carto Positron, OpenStreetMap.
- **Spatial Processing Pipelines:** Python 3.11+, GeoPandas, Shapely 2.0, Requests.
- **Brand Palette:** Salzburg `geoInnovation:lab+` corporate identity (Salzburg Geoinformatics Navy `#00364e`, Deep Navy `#002233`, Innovation Green `#16a34a` / `#22c55e`, Petrol `#0284c7`).

---

## 🚀 Quickstart Guide

### 1. Run the Interactive Web Demonstrator
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies (first time only)
npm install

# Start the local development server
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### 2. Run Data Processing & Spatial Joins (Python)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Fetch and compute district spatial joins & Point-in-Polygon clips
python src/fetch_kharkiv_districts.py

# Process raw UNOSAT shapefiles
python src/process_unosat.py
```

---

## 📁 Repository Structure
```text
├── data/
│   ├── processed/          # Processed GeoJSONs (Oblast, 9 Urban Districts, UNOSAT)
│   ├── raw/                # Raw Bellingcat API exports and UNOSAT shapefiles
│   └── samples/            # Static sample GeoJSONs & CSV summaries
├── docs/                   # Meeting notes, brief documents, source matrices
├── frontend/               # React 18 + Vite + MapLibre GL JS web application
│   ├── public/data/        # Live GeoJSON assets served to MapLibre
│   └── src/                # React components & application state
├── src/                    # Python data ingestion, spatial joins, and clipping
│   ├── fetch_kharkiv_districts.py
│   ├── process_unosat.py
│   └── build_webmap.py
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 👥 Contributors & Institutional Context
- **Department of Geoinformatics (Z_GIS), Paris Lodron University of Salzburg (PLUS):**
  - Hanzila Bin Younus (`hanzila.binyounus@stud.plus.ac.at`)
  - Demet Akbaba (`demet.akbaba@plus.ac.at`)
  - Dr. Omid Ghorbanzadeh
  - Prof. Dr. Thomas Blaschke
  - Erika Blaschke (*geoInnovation:lab+ Manager*)
- **O. M. Beketov National University of Urban Economy in Kharkiv:**
  - Prof. Kostiantyn Mamonov
