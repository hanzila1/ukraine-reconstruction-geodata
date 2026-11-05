"""Build standalone interactive Web Map Demonstrator from data/raw/api.json & ukr-civharm-2026-11-04.json."""
import csv
import json
from pathlib import Path


def process_and_build():
    raw_api_path = Path("data/raw/api.json")
    raw_export_path = Path("data/raw/ukr-civharm-2026-11-04.json")

    with open(raw_api_path, "r", encoding="utf-8") as f:
        api_data = json.load(f)

    export_by_id = {}
    if raw_export_path.exists():
        with open(raw_export_path, "r", encoding="utf-8") as f:
            for item in json.load(f):
                export_by_id[item.get("id")] = item

    ukr_features = []
    kharkiv_features = []
    kharkiv_rows = []
    compact_events = []

    for item in api_data:
        impacts = [i for i in item.get("impact", []) if i != "Military"]
        if not impacts and "Military" in item.get("impact", []):
            continue  # Strictly civilian restoration scope

        try:
            lat = float(item.get("latitude"))
            lon = float(item.get("longitude"))
        except (TypeError, ValueError):
            continue

        ev_id = item.get("id", "")
        date_iso = item.get("date") or "Unknown"
        loc = item.get("location") or ""
        desc = item.get("description") or ""
        sources = item.get("sources") or []
        src_url = sources[0] if sources else ""

        # Enrich from ukr-civharm-2026-11-04.json if missing
        ext = export_by_id.get(ev_id, {})
        if not desc and ext.get("description"):
            desc = ext["description"]
        if not src_url and ext.get("sources"):
            first_src = ext["sources"][0]
            if isinstance(first_src, dict):
                src_url = first_src.get("path", "")

        loc_lower = loc.lower()
        is_kharkiv = 1 if ("kharkiv" in loc_lower or (48.5 <= lat <= 50.5 and 34.8 <= lon <= 38.3)) else 0
        if not loc and is_kharkiv:
            loc = "Kharkiv Region"
        elif not loc:
            loc = "Ukraine"

        prim_sector = impacts[0] if impacts else "Unclassified Civilian"
        sectors_str = ", ".join(impacts) if impacts else "Unclassified Civilian"

        props = {
            "id": ev_id,
            "date": date_iso,
            "location": loc,
            "primary_sector": prim_sector,
            "sectors": sectors_str,
            "description": desc,
            "source_url": src_url,
            "is_kharkiv": bool(is_kharkiv),
        }

        feat = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": props,
        }
        ukr_features.append(feat)

        if is_kharkiv:
            kharkiv_features.append(feat)
            kharkiv_rows.append({**props, "latitude": lat, "longitude": lon})

        compact_events.append([
            ev_id,
            date_iso,
            loc,
            prim_sector,
            sectors_str,
            desc,
            src_url,
            round(lat, 5),
            round(lon, 5),
            is_kharkiv,
        ])

    # Save processed GeoJSON & CSV outputs
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    Path("data/samples").mkdir(parents=True, exist_ok=True)

    with open("data/samples/ukraine_civilian_damage_overview.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": ukr_features}, f, ensure_ascii=False)

    with open("data/samples/kharkiv_civilian_damage.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": kharkiv_features}, f, ensure_ascii=False, indent=2)

    with open("data/samples/kharkiv_civilian_damage.csv", "w", encoding="utf-8", newline="") as f:
        if kharkiv_rows:
            writer = csv.DictWriter(f, fieldnames=list(kharkiv_rows[0].keys()))
            writer.writeheader()
            writer.writerows(kharkiv_rows)

    events_json = json.dumps(compact_events, ensure_ascii=False)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>geoInnovation:lab | Ukraine & Kharkiv Post-War Recovery Web Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {{
      --bg-dark: #0f172a;
      --panel-bg: #1e293b;
      --panel-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-green: #10b981;
      --purple-cluster: #8b5cf6;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', sans-serif;
      background: var(--bg-dark);
      color: var(--text-main);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }}
    header {{
      background: #0b1120;
      border-bottom: 1px solid var(--panel-border);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 1000;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .brand-badge {{
      background: linear-gradient(135deg, #10b981, #0ea5e9);
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }}
    .brand h1 {{
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }}
    .brand p {{
      font-size: 11px;
      color: var(--text-muted);
    }}
    .view-buttons {{
      display: flex;
      gap: 8px;
      align-items: center;
    }}
    .btn {{
      background: var(--panel-bg);
      color: var(--text-main);
      border: 1px solid var(--panel-border);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }}
    .btn:hover {{
      border-color: var(--accent);
      color: var(--accent);
    }}
    .btn.active {{
      background: var(--accent);
      color: #0f172a;
      border-color: var(--accent);
      font-weight: 600;
    }}
    .btn-export {{
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #34d399;
    }}
    .btn-export:hover {{
      background: #10b981;
      color: #0f172a;
    }}
    .workspace {{
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }}
    .sidebar {{
      width: 360px;
      background: var(--panel-bg);
      border-right: 1px solid var(--panel-border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 14px;
      gap: 14px;
      z-index: 500;
    }}
    .kpi-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }}
    .kpi-card {{
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 9px 11px;
    }}
    .kpi-label {{
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }}
    .kpi-val {{
      font-size: 19px;
      font-weight: 700;
      margin-top: 3px;
      color: var(--accent);
    }}
    .kpi-sub {{
      font-size: 10px;
      color: var(--accent-green);
      margin-top: 2px;
    }}
    .section-title {{
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .filter-group {{
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 11px;
    }}
    .control-row {{
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 9px;
    }}
    .control-row:last-child {{ margin-bottom: 0; }}
    .control-row label {{
      font-size: 11px;
      color: #cbd5e1;
    }}
    select, input[type="text"] {{
      width: 100%;
      background: #0f172a;
      border: 1px solid var(--panel-border);
      color: #fff;
      padding: 6px 9px;
      border-radius: 6px;
      font-size: 12px;
    }}
    .sector-list {{
      display: flex;
      flex-direction: column;
      gap: 5px;
    }}
    .sector-bar-item {{
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 11px;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }}
    .sector-bar-item:hover {{
      background: rgba(255,255,255,0.05);
    }}
    .sector-bar-header {{
      display: flex;
      justify-content: space-between;
    }}
    .sector-bar-track {{
      height: 5px;
      background: #0f172a;
      border-radius: 3px;
      overflow: hidden;
    }}
    .sector-bar-fill {{
      height: 100%;
      border-radius: 3px;
    }}
    .map-container-col {{
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
    }}
    #map {{
      flex: 1;
      width: 100%;
      background: #0b1120;
    }}
    /* Bottom Timeline Bar (like Bellingcat TimeMap) */
    .timeline-bar {{
      height: 92px;
      background: #111827;
      border-top: 1px solid var(--panel-border);
      padding: 8px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 600;
    }}
    .timeline-header {{
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
    }}
    .timeline-bars-wrap {{
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 48px;
      padding-top: 4px;
    }}
    .t-bar {{
      flex: 1;
      background: rgba(139, 92, 246, 0.75);
      border-radius: 2px 2px 0 0;
      min-height: 2px;
      position: relative;
      cursor: pointer;
      transition: background 0.15s;
    }}
    .t-bar:hover {{
      background: #38bdf8;
    }}
    .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {{
      background-color: rgba(139, 92, 246, 0.35) !important;
    }}
    .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {{
      background-color: rgba(139, 92, 246, 0.88) !important;
      color: #fff !important;
      font-weight: 700 !important;
      font-family: 'Inter', sans-serif !important;
    }}
    .map-overlay-legend {{
      position: absolute;
      bottom: 108px;
      right: 16px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(6px);
      border: 1px solid var(--panel-border);
      padding: 11px 13px;
      border-radius: 8px;
      z-index: 600;
      font-size: 11px;
      max-width: 225px;
    }}
    .legend-item {{
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }}
    .legend-dot {{
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }}
    .leaflet-popup-content-wrapper {{
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #475569;
      border-radius: 8px;
    }}
    .leaflet-popup-tip {{ background: #1e293b; }}
    .popup-tag {{
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
    }}
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="brand-badge">geoInnovation:lab+</span>
      <div>
        <h1>Ukraine & Kharkiv Civilian Infrastructure Damage & Recovery Demonstrator</h1>
        <p>Z_GIS (University of Salzburg) × O. M. Beketov National University of Urban Economy in Kharkiv</p>
      </div>
    </div>
    <div class="view-buttons">
      <button class="btn" id="btn-ukr" onclick="setRegionView('ukraine')">🇺🇦 Ukraine Overview</button>
      <button class="btn active" id="btn-kharkiv-oblast" onclick="setRegionView('kharkiv_oblast')">📍 Kharkiv Oblast</button>
      <button class="btn" id="btn-kharkiv-city" onclick="setRegionView('kharkiv_city')">🏙️ Kharkiv Urban Core</button>
      <button class="btn" id="btn-saltivka" onclick="setRegionView('saltivka')">🔍 North Saltivka Hotspot</button>
      <button class="btn btn-export" onclick="exportFilteredGeoJSON()">⬇ Export GeoJSON</button>
    </div>
  </header>

  <div class="workspace">
    <aside class="sidebar">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Events in Filter</div>
          <div class="kpi-val" id="kpi-total">0</div>
          <div class="kpi-sub" id="kpi-scope-label">Verified Civilian</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Kharkiv Share</div>
          <div class="kpi-val" id="kpi-kharkiv-pct">31.4%</div>
          <div class="kpi-sub">789 of 2,512 National</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Housing / Residential</div>
          <div class="kpi-val" id="kpi-res">0</div>
          <div class="kpi-sub">Primary Recovery Need</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Schools & Healthcare</div>
          <div class="kpi-val" id="kpi-social">0</div>
          <div class="kpi-sub">Critical Social Infra</div>
        </div>
      </div>

      <div class="filter-group">
        <div class="section-title">Map Layers & Filters</div>
        <div class="control-row">
          <label>Geographic Scope</label>
          <select id="filter-scope" onchange="applyFilters()">
            <option value="all">All Ukraine (Overview - 2,512)</option>
            <option value="kharkiv" selected>Kharkiv Region Only (789)</option>
          </select>
        </div>
        <div class="control-row">
          <label>Civilian Infrastructure Sector</label>
          <select id="filter-sector" onchange="applyFilters()">
            <option value="ALL">All Civilian Sectors</option>
            <option value="Residential">Residential & Housing</option>
            <option value="School or childcare">Schools, Universities & Childcare</option>
            <option value="Healthcare">Healthcare & Hospitals</option>
            <option value="Commercial">Commercial & Urban Economy</option>
            <option value="Roads/Highways/Transport">Roads, Transport & Bridges</option>
            <option value="Administrative">Administrative & Municipal</option>
            <option value="Cultural">Cultural & Heritage</option>
            <option value="Industrial">Industrial & Energy</option>
            <option value="Food/Food Infrastructure">Food & Agricultural Infra</option>
          </select>
        </div>
        <div class="control-row">
          <label>Year Filter</label>
          <select id="filter-year" onchange="applyFilters()">
            <option value="ALL">All Years (2022 – 2025)</option>
            <option value="2022">2022</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div class="control-row">
          <label>Keyword / District Search</label>
          <input type="text" id="filter-search" placeholder="e.g., university, hospital, Saltivka..." oninput="applyFilters()" />
        </div>
        <div class="control-row" style="flex-direction:row; gap:8px; margin-top:8px;">
          <button class="btn active" id="toggle-clusters" style="flex:1" onclick="toggleLayer('clusters')">Clustered Points</button>
          <button class="btn" id="toggle-heat" style="flex:1" onclick="toggleLayer('heat')">Damage Heatmap</button>
        </div>
      </div>

      <div class="filter-group" style="flex:1; display:flex; flex-direction:column;">
        <div class="section-title">
          <span>Civilian Sector Breakdown</span>
          <span style="font-size:10px; color:#38bdf8; cursor:pointer;" onclick="resetSector()">Reset</span>
        </div>
        <div class="sector-list" id="sector-bars"></div>
      </div>

      <div style="font-size:10px; color:var(--text-muted); line-height:1.4;">
        <strong>Data Source:</strong> Bellingcat / Forensic Architecture Civilian Harm TimeMap (`data/raw/api.json` & `ukr-civharm-2026-11-04.json`), filtered to civilian & urban recovery sectors.
      </div>
    </aside>

    <div class="map-container-col">
      <div id="map"></div>
      <div class="timeline-bar">
        <div class="timeline-header">
          <span id="timeline-label">TEMPORAL DISTRIBUTION (FEB 2022 – SEP 2025) — Click any bar to filter year</span>
          <span style="color:#a78bfa; font-weight:600;">Monthly Incident Frequency</span>
        </div>
        <div class="timeline-bars-wrap" id="timeline-chart"></div>
      </div>
    </div>

    <div class="map-overlay-legend">
      <div style="font-weight:600; margin-bottom:5px; color:#fff;">Civilian Infrastructure Sectors</div>
      <div class="legend-item"><span class="legend-dot" style="background:#f43f5e;"></span> Residential & Housing</div>
      <div class="legend-item"><span class="legend-dot" style="background:#f59e0b;"></span> Schools, Uni & Childcare</div>
      <div class="legend-item"><span class="legend-dot" style="background:#ef4444;"></span> Healthcare & Hospitals</div>
      <div class="legend-item"><span class="legend-dot" style="background:#38bdf8;"></span> Commercial & Urban Economy</div>
      <div class="legend-item"><span class="legend-dot" style="background:#a855f7;"></span> Transport & Roads</div>
      <div class="legend-item"><span class="legend-dot" style="background:#10b981;"></span> Cultural, Admin & Other</div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <script>
    const RAW_EVENTS = {events_json};
    let currentFilteredEvents = [];

    const SECTOR_COLORS = {{
      "Residential": "#f43f5e",
      "School or childcare": "#f59e0b",
      "Healthcare": "#ef4444",
      "Commercial": "#38bdf8",
      "Roads/Highways/Transport": "#a855f7",
      "Administrative": "#10b981",
      "Cultural": "#14b8a6",
      "Industrial": "#6366f1",
      "Food/Food Infrastructure": "#84cc16",
      "Religious": "#eab308",
      "Humanitarian": "#06b6d4"
    }};

    function getColor(sector) {{
      return SECTOR_COLORS[sector] || "#94a3b8";
    }}

    const map = L.map('map', {{
      center: [49.9935, 36.2304],
      zoom: 10,
      preferCanvas: true
    }});

    const darkBasemap = L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }});
    const lightBasemap = L.tileLayer('https://{{s}}.basemaps.cartocdn.com/rastertiles/voyager/{{z}}/{{x}}/{{y}}{{r}}.png', {{
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }});
    const satelliteBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{{z}}/{{y}}/{{x}}', {{
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19
    }});
    const osmBasemap = L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }});

    darkBasemap.addTo(map);

    L.control.layers({{
      "Carto Dark (Analytics)": darkBasemap,
      "Carto Voyager (Bellingcat Light Style)": lightBasemap,
      "Esri World Imagery (High-Res Satellite)": satelliteBasemap,
      "OpenStreetMap (Street Level)": osmBasemap
    }}, null, {{ position: 'topright' }}).addTo(map);

    let clusterGroup = L.markerClusterGroup({{
      showCoverageOnHover: false,
      maxClusterRadius: 45
    }});
    let heatLayer = null;
    let showClusters = true;
    let showHeat = false;

    map.addLayer(clusterGroup);

    function applyFilters() {{
      const scope = document.getElementById('filter-scope').value;
      const sector = document.getElementById('filter-sector').value;
      const year = document.getElementById('filter-year').value;
      const search = document.getElementById('filter-search').value.trim().toLowerCase();

      clusterGroup.clearLayers();
      if (heatLayer) {{
        map.removeLayer(heatLayer);
      }}

      const heatPoints = [];
      const sectorCounts = {{}};
      const monthCounts = {{}};
      currentFilteredEvents = [];
      let totalCount = 0;
      let resCount = 0;
      let socialCount = 0;

      for (const ev of RAW_EVENTS) {{
        const [id, date, loc, primSector, allSectors, desc, srcUrl, lat, lon, isKharkiv] = ev;

        if (scope === 'kharkiv' && !isKharkiv) continue;
        if (sector !== 'ALL' && !allSectors.includes(sector)) continue;
        if (year !== 'ALL' && !date.startsWith(year)) continue;
        if (search && !(desc.toLowerCase().includes(search) || loc.toLowerCase().includes(search) || allSectors.toLowerCase().includes(search))) continue;

        currentFilteredEvents.push(ev);
        totalCount++;
        if (allSectors.includes("Residential")) resCount++;
        if (allSectors.includes("School or childcare") || allSectors.includes("Healthcare")) socialCount++;

        sectorCounts[primSector] = (sectorCounts[primSector] || 0) + 1;
        if (date && date.length >= 7) {{
          const ym = date.substring(0, 7);
          monthCounts[ym] = (monthCounts[ym] || 0) + 1;
        }}

        const color = getColor(primSector);
        const marker = L.circleMarker([lat, lon], {{
          radius: 7,
          fillColor: color,
          color: "#ffffff",
          weight: 1.2,
          opacity: 0.9,
          fillOpacity: 0.85
        }});

        const srcLink = srcUrl ? `<div style="margin-top:6px;"><a href="${{srcUrl}}" target="_blank" style="color:#38bdf8; text-decoration:none; font-size:11px;">🔗 View Open-Source Verification &rarr;</a></div>` : '';
        marker.bindPopup(`
          <div style="font-family:'Inter',sans-serif; min-width:220px;">
            <span class="popup-tag" style="background:${{color}}33; color:${{color}}; border:1px solid ${{color}};">${{primSector}}</span>
            <div style="font-size:13px; font-weight:600; margin-bottom:4px;">📍 ${{loc}} <span style="color:#94a3b8; font-weight:400;">(${{date}})</span></div>
            <div style="font-size:12px; color:#cbd5e1; line-height:1.4;">${{desc || 'Verified civilian infrastructure damage event.'}}</div>
            <div style="font-size:11px; color:#94a3b8; margin-top:6px;">Sectors: ${{allSectors}} | ID: ${{id}}</div>
            ${{srcLink}}
          </div>
        `);

        clusterGroup.addLayer(marker);
        heatPoints.push([lat, lon, 0.8]);
      }}

      heatLayer = L.heatLayer(heatPoints, {{
        radius: 22,
        blur: 16,
        maxZoom: 14,
        gradient: {{0.3: '#38bdf8', 0.6: '#a855f7', 0.85: '#f43f5e', 1.0: '#fef08a'}}
      }});

      if (showHeat) {{
        heatLayer.addTo(map);
      }}

      document.getElementById('kpi-total').textContent = totalCount.toLocaleString();
      document.getElementById('kpi-scope-label').textContent = scope === 'kharkiv' ? 'Kharkiv Region' : 'All Ukraine';
      document.getElementById('kpi-res').textContent = resCount.toLocaleString();
      document.getElementById('kpi-social').textContent = socialCount.toLocaleString();

      const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const barsContainer = document.getElementById('sector-bars');
      barsContainer.innerHTML = sortedSectors.map(([sec, count]) => {{
        const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        const c = getColor(sec);
        return `
          <div class="sector-bar-item" onclick="selectSectorFromBar('${{sec}}')">
            <div class="sector-bar-header">
              <span>${{sec}}</span>
              <span style="color:#94a3b8;">${{count}} (${{pct}}%)</span>
            </div>
            <div class="sector-bar-track">
              <div class="sector-bar-fill" style="width:${{pct}}%; background:${{c}};"></div>
            </div>
          </div>
        `;
      }}).join('');

      renderTimeline(monthCounts);
    }}

    function renderTimeline(monthCounts) {{
      const months = [];
      for (let y = 2022; y <= 2025; y++) {{
        for (let m = 1; m <= 12; m++) {{
          if (y === 2022 && m < 2) continue;
          if (y === 2025 && m > 9) continue;
          const ym = `${{y}}-${{String(m).padStart(2, '0')}}`;
          months.push([ym, monthCounts[ym] || 0]);
        }}
      }}
      const maxVal = Math.max(1, ...months.map(x => x[1]));
      const container = document.getElementById('timeline-chart');
      container.innerHTML = months.map(([ym, cnt]) => {{
        const hPct = Math.max(4, Math.round((cnt / maxVal) * 100));
        return `<div class="t-bar" style="height:${{hPct}}%;" title="${{ym}}: ${{cnt}} verified civilian incidents" onclick="filterByYear('${{ym.substring(0,4)}}')"></div>`;
      }}).join('');
    }}

    function filterByYear(yr) {{
      const sel = document.getElementById('filter-year');
      sel.value = (sel.value === yr) ? 'ALL' : yr;
      applyFilters();
    }}

    function selectSectorFromBar(sec) {{
      document.getElementById('filter-sector').value = sec;
      applyFilters();
    }}

    function resetSector() {{
      document.getElementById('filter-sector').value = 'ALL';
      document.getElementById('filter-year').value = 'ALL';
      applyFilters();
    }}

    function toggleLayer(type) {{
      if (type === 'clusters') {{
        showClusters = !showClusters;
        document.getElementById('toggle-clusters').classList.toggle('active', showClusters);
        if (showClusters) map.addLayer(clusterGroup);
        else map.removeLayer(clusterGroup);
      }} else if (type === 'heat') {{
        showHeat = !showHeat;
        document.getElementById('toggle-heat').classList.toggle('active', showHeat);
        if (showHeat && heatLayer) map.addLayer(heatLayer);
        else if (heatLayer) map.removeLayer(heatLayer);
      }}
    }}

    function setRegionView(view) {{
      document.querySelectorAll('.view-buttons .btn').forEach(b => b.classList.remove('active'));
      if (view === 'ukraine') {{
        document.getElementById('btn-ukr').classList.add('active');
        document.getElementById('filter-scope').value = 'all';
        applyFilters();
        map.flyTo([48.5, 34.0], 6, {{ duration: 1.2 }});
      }} else if (view === 'kharkiv_oblast') {{
        document.getElementById('btn-kharkiv-oblast').classList.add('active');
        document.getElementById('filter-scope').value = 'kharkiv';
        applyFilters();
        map.flyTo([49.85, 36.55], 8, {{ duration: 1.2 }});
      }} else if (view === 'kharkiv_city') {{
        document.getElementById('btn-kharkiv-city').classList.add('active');
        document.getElementById('filter-scope').value = 'kharkiv';
        applyFilters();
        map.flyTo([49.9935, 36.2304], 12, {{ duration: 1.2 }});
      }} else if (view === 'saltivka') {{
        document.getElementById('btn-saltivka').classList.add('active');
        document.getElementById('filter-scope').value = 'kharkiv';
        applyFilters();
        map.flyTo([50.036, 36.355], 14, {{ duration: 1.2 }});
      }}
    }}

    function exportFilteredGeoJSON() {{
      const features = currentFilteredEvents.map(ev => ({{
        type: "Feature",
        geometry: {{ type: "Point", coordinates: [ev[8], ev[7]] }},
        properties: {{
          id: ev[0],
          date: ev[1],
          location: ev[2],
          primary_sector: ev[3],
          sectors: ev[4],
          description: ev[5],
          source_url: ev[6]
        }}
      }}));
      const blob = new Blob([JSON.stringify({{ type: "FeatureCollection", features }}, null, 2)], {{ type: "application/geo+json" }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kharkiv_ukraine_filtered_${{features.length}}_events.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    }}

    applyFilters();
  </script>
</body>
</html>
"""
    out_path = Path("app/kharkiv_recovery_webmap.html")
    out_path.write_text(html_content, encoding="utf-8")
    print(f"Processed {len(ukr_features)} Ukraine civilian events ({len(kharkiv_features)} in Kharkiv) and rebuilt {out_path}")


if __name__ == "__main__":
    process_and_build()
