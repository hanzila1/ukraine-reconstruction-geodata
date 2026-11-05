"""Convert UNOSAT Kharkiv Comprehensive Damage Assessment (CDA) shapefile to clean GeoJSON."""
import json
import math
from pathlib import Path
import shapefile


def web_mercator_to_wgs84(x, y):
    lon = (x / 20037508.34) * 180
    lat = (y / 20037508.34) * 180
    lat = 180 / math.pi * (2 * math.atan(math.exp(lat * math.pi / 180)) - math.pi / 2)
    return round(lon, 6), round(lat, 6)


DAMAGE_LABELS = {
    1: {"grade": "Destroyed", "color": "#e11d48", "priority": 1, "desc": "Structure flattened or completely collapsed"},
    2: {"grade": "Severe Damage", "color": "#ea580c", "priority": 2, "desc": "Roof collapsed / major structural wall failure"},
    3: {"grade": "Moderate Damage", "color": "#eab308", "priority": 3, "desc": "Partial facade / roof puncture or blast damage"},
    4: {"grade": "Possible Damage", "color": "#64748b", "priority": 4, "desc": "Possible structural / surrounding impact"},
    7: {"grade": "Impact Crater / Field", "color": "#8b5cf6", "priority": 5, "desc": "Direct artillery / missile impact crater"},
    5: {"grade": "Other Structural Damage", "color": "#06b6d4", "priority": 6, "desc": "Other assessed damage site"}
}


def build_unosat_geojson():
    shp_path = Path("data/raw/unosat_kharkiv/cda/Kharkiv_CDA_20220424.shp")
    sf = shapefile.Reader(str(shp_path))

    features = []
    stats = {k["grade"]: 0 for k in DAMAGE_LABELS.values()}

    for i, (rec, shp) in enumerate(zip(sf.records(), sf.shapes())):
        pt = shp.points[0]
        lon, lat = web_mercator_to_wgs84(pt[0], pt[1])
        d_code = rec["Main_Damag"]
        meta = DAMAGE_LABELS.get(d_code, {"grade": f"Code {d_code}", "color": "#94a3b8", "priority": 99, "desc": ""})

        stats[meta["grade"]] = stats.get(meta["grade"], 0) + 1

        props = {
            "id": f"UNOSAT-KHK-{i+1:04d}",
            "source": "UNOSAT Rapid & Comprehensive Damage Assessment (CE20220223UKR)",
            "assessment_date": str(rec["SensorDate"]),
            "settlement": rec["Settlement"],
            "damage_code": d_code,
            "damage_grade": meta["grade"],
            "damage_color": meta["color"],
            "damage_description": meta["desc"],
            "confidence": "High" if rec["Confidence"] == 1 else "Medium",
            "event_code": rec["EventCode"]
        }

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": props
        })

    out_geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "UNOSAT Kharkiv Comprehensive Building Damage Assessment",
            "event": "CE20220223UKR",
            "total_assessed_structures": len(features),
            "stats": stats
        },
        "features": features
    }

    Path("data/processed").mkdir(parents=True, exist_ok=True)
    out_file = Path("data/processed/unosat_kharkiv_building_damage.geojson")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(out_geojson, f, ensure_ascii=False, indent=2)

    # Copy to frontend public dir
    public_file = Path("frontend/public/data/unosat_kharkiv_building_damage.geojson")
    with open(public_file, "w", encoding="utf-8") as f:
        json.dump(out_geojson, f, ensure_ascii=False)

    print(f"Successfully converted {len(features)} building damage assessments.")
    print("Damage stats:", json.dumps(stats, indent=2))
    print(f"Saved to {out_file} and {public_file}")


if __name__ == "__main__":
    build_unosat_geojson()

