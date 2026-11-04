"""Fetch real administrative boundaries for Kharkiv Oblast, Kharkiv City, and Kharkiv City's 9 Urban Districts (Raions) from OpenStreetMap, perform Point-in-Polygon spatial joins with Bellingcat + UNOSAT datasets, and save GeoJSONs."""
import json
import time
import requests
from pathlib import Path
from collections import Counter

KHARKIV_CITY_DISTRICTS = [
    {"name_en": "Saltivskyi District", "name_uk": "Салтівський район", "query": "Салтівський район, Харків"},
    {"name_en": "Kyivskyi District", "name_uk": "Київський район", "query": "Київський район, Харків"},
    {"name_en": "Shevchenkivskyi District", "name_uk": "Шевченківський район", "query": "Шевченківський район, Харків"},
    {"name_en": "Industrialnyi District", "name_uk": "Індустріальний район", "query": "Індустріальний район, Харків"},
    {"name_en": "Nemyshlianskyi District", "name_uk": "Немишлянський район", "query": "Немишлянський район, Харків"},
    {"name_en": "Slobidskyi District", "name_uk": "Слобідський район", "query": "Слобідський район, Харків"},
    {"name_en": "Osnovianskyi District", "name_uk": "Основ'янський район", "query": "Основ'янський район, Харків"},
    {"name_en": "Kholodnohirskyi District", "name_uk": "Холодногірський район", "query": "Холодногірський район, Харків"},
    {"name_en": "Novobavarskyi District", "name_uk": "Новобаварський район", "query": "Новобаварський район, Харків"},
]

headers = {"User-Agent": "Z_GIS_GeoInnovationLab_Kharkiv_Recovery/1.0 (plus.ac.at)"}


def fetch_nominatim_geojson(query_str, threshold=0.0003):
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query_str,
        "format": "geojson",
        "polygon_geojson": 1,
        "polygon_threshold": threshold,
        "limit": 3,
    }
    r = requests.get(url, params=params, headers=headers, timeout=25)
    if r.status_code == 200:
        data = r.json()
        for feat in data.get("features", []):
            geom_type = feat.get("geometry", {}).get("type", "")
            if geom_type in ("Polygon", "MultiPolygon"):
                return feat
    return None


def point_in_ring(lon, lat, ring):
    """Ray-casting point in polygon ring."""
    inside = False
    n = len(ring)
    p1x, p1y = ring[0][0], ring[0][1]
    for i in range(1, n + 1):
        p2x, p2y = ring[i % n][0], ring[i % n][1]
        if lat > min(p1y, p2y):
            if lat <= max(p1y, p2y):
                if lon <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lon <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def point_in_geometry(lon, lat, geom):
    gtype = geom["type"]
    coords = geom["coordinates"]
    if gtype == "Polygon":
        if not point_in_ring(lon, lat, coords[0]):
            return False
        for hole in coords[1:]:
            if point_in_ring(lon, lat, hole):
                return False
        return True
    elif gtype == "MultiPolygon":
        for poly in coords:
            if point_in_ring(lon, lat, poly[0]):
                in_hole = False
                for hole in poly[1:]:
                    if point_in_ring(lon, lat, hole):
                        in_hole = True
                        break
                if not in_hole:
                    return True
        return False
    return False


def get_bbox_and_center(geom):
    lons, lats = [], []
    if geom["type"] == "Polygon":
        for pt in geom["coordinates"][0]:
            lons.append(pt[0])
            lats.append(pt[1])
    elif geom["type"] == "MultiPolygon":
        for poly in geom["coordinates"]:
            for pt in poly[0]:
                lons.append(pt[0])
                lats.append(pt[1])
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    return (
        [round(min_lon, 5), round(min_lat, 5), round(max_lon, 5), round(max_lat, 5)],
        [round((min_lon + max_lon) / 2, 5), round((min_lat + max_lat) / 2, 5)],
    )


def main():
    # Load existing Bellingcat & UNOSAT datasets
    with open("frontend/public/data/ukraine_civilian_damage.geojson", "r", encoding="utf-8") as f:
        bellingcat_feats = json.load(f)["features"]

    with open("frontend/public/data/unosat_kharkiv_building_damage.geojson", "r", encoding="utf-8") as f:
        unosat_feats = json.load(f)["features"]

    main_features = []

    print("1. Fetching Kharkiv Oblast main perimeter...")
    oblast_feat = fetch_nominatim_geojson("Kharkiv Oblast, Ukraine", threshold=0.001)
    if oblast_feat:
        bbox, center = get_bbox_and_center(oblast_feat["geometry"])
        oblast_feat["properties"] = {
            "id": "kharkiv_oblast",
            "name_en": "Kharkiv Oblast",
            "name_uk": "Харківська область",
            "boundary_type": "oblast",
            "bbox": bbox,
            "center": center,
        }
        main_features.append(oblast_feat)

    time.sleep(0.5)
    print("2. Fetching Kharkiv City main municipal perimeter...")
    city_feat = fetch_nominatim_geojson("Kharkiv, Ukraine", threshold=0.0004)
    if city_feat:
        bbox, center = get_bbox_and_center(city_feat["geometry"])
        city_feat["properties"] = {
            "id": "kharkiv_city",
            "name_en": "Kharkiv City Municipality",
            "name_uk": "Місто Харків",
            "boundary_type": "city",
            "bbox": bbox,
            "center": center,
        }
        main_features.append(city_feat)

    district_features = []
    print("3. Fetching 9 Urban Districts (Raions) & computing spatial joins...")
    for idx, d in enumerate(KHARKIV_CITY_DISTRICTS, start=1):
        time.sleep(0.4)
        feat = fetch_nominatim_geojson(d["query"], threshold=0.0002)
        if not feat:
            print(f"  -> Retrying {d['name_en']}...")
            time.sleep(1)
            feat = fetch_nominatim_geojson(d["name_en"] + ", Kharkiv", threshold=0.0002)
        if not feat:
            continue

        geom = feat["geometry"]
        bbox, center = get_bbox_and_center(geom)

        # Count Bellingcat incidents inside district
        b_count = 0
        res_count = 0
        social_count = 0
        sector_counter = Counter()

        for bf in bellingcat_feats:
            lon, lat = bf["geometry"]["coordinates"]
            if bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                if point_in_geometry(lon, lat, geom):
                    b_count += 1
                    p = bf["properties"]
                    prim = p.get("primary_sector", "Unclassified Civilian")
                    sector_counter[prim] += 1
                    secs = p.get("sectors", "")
                    if "Residential" in secs:
                        res_count += 1
                    if "School or childcare" in secs or "Healthcare" in secs:
                        social_count += 1

        # Count UNOSAT buildings inside district
        u_count = 0
        u_destroyed = 0
        u_severe = 0
        u_moderate = 0
        u_possible = 0

        for uf in unosat_feats:
            lon, lat = uf["geometry"]["coordinates"]
            if bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]:
                if point_in_geometry(lon, lat, geom):
                    u_count += 1
                    grade = uf["properties"].get("damage_grade", "")
                    if grade == "Destroyed":
                        u_destroyed += 1
                    elif grade == "Severe Damage":
                        u_severe += 1
                    elif grade == "Moderate Damage":
                        u_moderate += 1
                    else:
                        u_possible += 1

        # Composite Recovery Priority Score
        total_burden = b_count + u_count
        if total_burden >= 120:
            tier = "Critical Priority"
            fill_color = "#ef4444"
        elif total_burden >= 55:
            tier = "High Priority"
            fill_color = "#f97316"
        elif total_burden >= 25:
            tier = "Moderate Priority"
            fill_color = "#eab308"
        else:
            tier = "Baseline Recovery"
            fill_color = "#22c55e"

        top_sector = sector_counter.most_common(1)[0][0] if sector_counter else "Residential"

        feat["id"] = idx
        feat["properties"] = {
            "id": d["name_en"].lower().replace(" ", "_"),
            "district_num": idx,
            "name_en": d["name_en"],
            "short_name": d["name_en"].replace(" District", ""),
            "name_uk": d["name_uk"],
            "bellingcat_count": b_count,
            "unosat_count": u_count,
            "total_burden": total_burden,
            "unosat_destroyed": u_destroyed,
            "unosat_severe": u_severe,
            "unosat_moderate": u_moderate,
            "unosat_possible": u_possible,
            "residential_incidents": res_count,
            "social_incidents": social_count,
            "top_sector": top_sector,
            "priority_tier": tier,
            "fill_color": fill_color,
            "bbox": bbox,
            "center": center,
        }
        district_features.append(feat)
        print(
            f"  -> {d['name_en']}: {b_count} incidents, {u_count} UNOSAT buildings (Total={total_burden}, Tier={tier})"
        )

    # Sort districts by total_burden descending
    district_features.sort(key=lambda x: x["properties"]["total_burden"], reverse=True)

    # 4. Strictly tag every Bellingcat & UNOSAT feature using exact Point-in-Polygon (PIP)
    #    against Kharkiv Oblast, Kharkiv City, and the 9 Urban Districts (Raions)
    oblast_geom = main_features[0]["geometry"] if main_features else None
    city_geom = main_features[1]["geometry"] if len(main_features) > 1 else None

    strict_kharkiv_bellingcat = []
    for bf in bellingcat_feats:
        lon, lat = bf["geometry"]["coordinates"]
        d_id = ""
        d_name = ""
        for df in district_features:
            dbbox = df["properties"]["bbox"]
            if dbbox[0] <= lon <= dbbox[2] and dbbox[1] <= lat <= dbbox[3]:
                if point_in_geometry(lon, lat, df["geometry"]):
                    d_id = df["properties"]["id"]
                    d_name = df["properties"]["name_en"]
                    break

        in_city = bool(d_id) or (city_geom is not None and point_in_geometry(lon, lat, city_geom))
        in_oblast = in_city or (oblast_geom is not None and point_in_geometry(lon, lat, oblast_geom))

        bf["properties"]["is_kharkiv"] = bool(in_oblast)
        bf["properties"]["in_kharkiv_oblast"] = bool(in_oblast)
        bf["properties"]["in_kharkiv_city"] = bool(in_city)
        bf["properties"]["district_id"] = d_id
        bf["properties"]["district_name"] = d_name

        if in_oblast:
            strict_kharkiv_bellingcat.append(bf)

    for uf in unosat_feats:
        lon, lat = uf["geometry"]["coordinates"]
        d_id = ""
        d_name = ""
        for df in district_features:
            dbbox = df["properties"]["bbox"]
            if dbbox[0] <= lon <= dbbox[2] and dbbox[1] <= lat <= dbbox[3]:
                if point_in_geometry(lon, lat, df["geometry"]):
                    d_id = df["properties"]["id"]
                    d_name = df["properties"]["name_en"]
                    break

        in_city = bool(d_id) or (city_geom is not None and point_in_geometry(lon, lat, city_geom))
        in_oblast = in_city or (oblast_geom is not None and point_in_geometry(lon, lat, oblast_geom))

        uf["properties"]["in_kharkiv_oblast"] = bool(in_oblast)
        uf["properties"]["in_kharkiv_city"] = bool(in_city)
        uf["properties"]["district_id"] = d_id
        uf["properties"]["district_name"] = d_name

    # Update Kharkiv Oblast & City counts in main_features properties
    if len(main_features) >= 1:
        main_features[0]["properties"]["bellingcat_count"] = len(strict_kharkiv_bellingcat)
        main_features[0]["properties"]["unosat_count"] = len(unosat_feats)
    if len(main_features) >= 2:
        main_features[1]["properties"]["bellingcat_count"] = sum(
            1 for bf in bellingcat_feats if bf["properties"].get("in_kharkiv_city")
        )
        main_features[1]["properties"]["unosat_count"] = sum(
            1 for uf in unosat_feats if uf["properties"].get("in_kharkiv_city")
        )

    # Save GeoJSONs to both data/processed, data/samples, and frontend/public/data
    for folder in [Path("data/processed"), Path("frontend/public/data")]:
        folder.mkdir(parents=True, exist_ok=True)
        with open(folder / "kharkiv_main_boundaries.geojson", "w", encoding="utf-8") as f:
            json.dump({"type": "FeatureCollection", "features": main_features}, f, ensure_ascii=False)
        with open(folder / "kharkiv_urban_districts.geojson", "w", encoding="utf-8") as f:
            json.dump({"type": "FeatureCollection", "features": district_features}, f, ensure_ascii=False)
        with open(folder / "unosat_kharkiv_building_damage.geojson", "w", encoding="utf-8") as f:
            json.dump({"type": "FeatureCollection", "features": unosat_feats}, f, ensure_ascii=False)

    with open("frontend/public/data/ukraine_civilian_damage.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": bellingcat_feats}, f, ensure_ascii=False)

    with open("data/samples/ukraine_civilian_damage_overview.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": bellingcat_feats}, f, ensure_ascii=False)

    with open("data/samples/kharkiv_civilian_damage.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": strict_kharkiv_bellingcat}, f, ensure_ascii=False, indent=2)

    print(
        f"Saved strictly polygon-clipped datasets! Kharkiv Oblast incidents = {len(strict_kharkiv_bellingcat)} (0 out-of-boundary points)."
    )


if __name__ == "__main__":
    main()
