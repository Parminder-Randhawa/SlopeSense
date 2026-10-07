#!/usr/bin/env python3
"""Build SlopeSense's small, static GeoJSON snapshots from OSM XML exports.

Usage:
  python3 scripts/import-osm.py \
    --cypress /path/to/cypress.osm \
    --grouse /path/to/grouse.osm \
    --seymour /path/to/seymour.osm \
    --snapshot-date 2026-10-06 --output src/data

The runtime application never calls Overpass or the OSM data API. This script is
only a documented, reproducible import step for refreshing the local snapshots.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import date
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any


SELECTED_RUNS: dict[str, list[str]] = {
    "cypress": [
        "Panorama",
        "Windjammer",
        "Collins",
        "Crazy Raven",
        "Horizon",
        "T-33",
        "Shoreline",
        "Blow By",
        "Trumpeter",
        "Black on Black",
        "Top Gun",
        "Gibsons Glades",
    ],
    "grouse": [
        "The Cut",
        "Teddy Bear Lane",
        "Paradise",
        "Paper Trail",
        "Skyline",
        "Expo",
        "Heaven's Sake",
        "Hades",
        "Inferno",
        "Outer Limits",
        "Peak Glades",
        "Devil's Advocate",
        "Peak Cliffs",
    ],
    "seymour": [
        "Flower Basin",
        "Goldie Meadows",
        "Manning",
        "Northlands",
        "Mystery Lake",
        "Hang Ten",
        "Maverick",
        "Unicorn",
        "Sterns Stairway",
        "Devil's Drop",
        "Sunshine Ridge",
        "Pete's Glades",
    ],
}

DIFFICULTY_MAP = {
    "novice": "green",
    "easy": "green",
    "intermediate": "blue",
    "advanced": "black",
    "expert": "double-black",
}

GROOMING_MAP = {
    "groomed": "groomed",
    "machine": "groomed",
    "classic": "groomed",
    "skating": "groomed",
    "classic+skating": "groomed",
    "mogul": "moguls",
    "moguls": "moguls",
    "backcountry": "backcountry",
}


def slugify(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def haversine_meters(a: list[float], b: list[float]) -> float:
    earth_radius = 6_371_008.8
    lon1, lat1 = map(math.radians, a)
    lon2, lat2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    value = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    return 2 * earth_radius * math.asin(math.sqrt(value))


def line_length(coordinates: list[list[float]]) -> float:
    return sum(haversine_meters(a, b) for a, b in zip(coordinates, coordinates[1:]))


def read_osm(path: Path, resort_id: str, snapshot_date: date) -> list[dict[str, Any]]:
    root = ET.parse(path).getroot()
    nodes = {
        node.attrib["id"]: [float(node.attrib["lon"]), float(node.attrib["lat"])]
        for node in root.findall("node")
    }
    selected = set(SELECTED_RUNS[resort_id])
    grouped: dict[str, list[dict[str, Any]]] = {name: [] for name in selected}

    for way in root.findall("way"):
        tags = {
            tag.attrib["k"]: tag.attrib["v"]
            for tag in way.findall("tag")
            if "k" in tag.attrib and "v" in tag.attrib
        }
        name = tags.get("name")
        if tags.get("piste:type") != "downhill" or not name:
            continue

        coordinates = [
            nodes[nd.attrib["ref"]]
            for nd in way.findall("nd")
            if nd.attrib.get("ref") in nodes
        ]
        if len(coordinates) < 2:
            continue

        grouped.setdefault(name, []).append(
            {
                "wayId": way.attrib["id"],
                "coordinates": coordinates,
                "difficulty": tags.get("piste:difficulty"),
                "grooming": tags.get("piste:grooming"),
                "tags": {
                    key: value
                    for key, value in tags.items()
                    if key.startswith("piste:") or key in {"name", "lit", "oneway"}
                },
            }
        )

    features: list[dict[str, Any]] = []
    for name in SELECTED_RUNS[resort_id] + sorted(set(grouped) - selected):
        segments = grouped.get(name, [])
        if not segments:
            raise ValueError(f"{resort_id}: selected run '{name}' was not found")

        difficulty_values = sorted(
            {item["difficulty"] for item in segments if item["difficulty"]}
        )
        normalized_difficulties = {
            DIFFICULTY_MAP.get(value, "unknown") for value in difficulty_values
        }
        difficulty = (
            normalized_difficulties.pop()
            if len(normalized_difficulties) == 1
            else "unknown"
        )

        grooming_values = sorted(
            {item["grooming"] for item in segments if item["grooming"]}
        )
        normalized_grooming = {
            GROOMING_MAP.get(value, "unknown") for value in grooming_values
        }
        grooming = (
            normalized_grooming.pop() if len(normalized_grooming) == 1 else "unknown"
        )

        lines = [item["coordinates"] for item in segments]
        geometry = (
            {"type": "LineString", "coordinates": lines[0]}
            if len(lines) == 1
            else {"type": "MultiLineString", "coordinates": lines}
        )
        length = round(sum(line_length(line) for line in lines))
        feature_id = f"{resort_id}-{slugify(name)}"

        features.append(
            {
                "type": "Feature",
                "id": feature_id,
                "properties": {
                    "id": feature_id,
                    "name": name,
                    "resortId": resort_id,
                    "difficulty": difficulty,
                    "lengthMeters": length,
                    "grooming": grooming,
                    "source": "OpenStreetMap",
                    "metadata": {
                        "osmWayIds": [item["wayId"] for item in segments],
                        "osmDifficultyValues": difficulty_values,
                        "osmGroomingValues": grooming_values,
                        "osmTags": [item["tags"] for item in segments],
                        "snapshotDate": snapshot_date.isoformat(),
                    },
                },
                "geometry": geometry,
            }
        )

    return features


def read_context(path: Path, snapshot_date: date) -> dict[str, Any]:
    root = ET.parse(path).getroot()
    nodes = {
        n.attrib["id"]: [float(n.attrib["lon"]), float(n.attrib["lat"])]
        for n in root.findall("node")
    }
    features = []
    lift_types = {
        "chair_lift", "gondola", "cable_car", "drag_lift",
        "magic_carpet", "t-bar", "platter",
    }
    for way in root.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
        if tags.get("piste:type") == "downhill" and not tags.get("name"):
            kind = "connector"
        elif tags.get("aerialway") in lift_types:
            kind = "lift"
        elif tags.get("natural") == "water":
            kind = "water"
        elif tags.get("waterway"):
            kind = "stream"
        elif tags.get("building"):
            kind = "building"
        elif tags.get("natural") == "wood" or tags.get("landuse") == "forest":
            kind = "wood"
        elif tags.get("highway"):
            kind = "path"
        else:
            continue
        points = [
            nodes[nd.attrib["ref"]] for nd in way.findall("nd")
            if nd.attrib.get("ref") in nodes
        ]
        if len(points) < 2:
            continue
        polygon = (
            kind in {"water", "wood", "building"}
            and len(points) >= 4 and points[0] == points[-1]
        )
        features.append({
            "type": "Feature", "id": way.attrib["id"],
            "properties": {
                "kind": kind, "name": tags.get("name", ""),
                "osmWayId": way.attrib["id"],
            },
            "geometry": {
                "type": "Polygon" if polygon else "LineString",
                "coordinates": [points] if polygon else points,
            },
        })
    return {
        "type": "FeatureCollection", "source": "© OpenStreetMap contributors",
        "license": "ODbL 1.0", "snapshotDate": snapshot_date.isoformat(),
        "features": features,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    for resort_id in SELECTED_RUNS:
        parser.add_argument(f"--{resort_id}", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("src/data"))
    parser.add_argument("--snapshot-date", type=date.fromisoformat, default=date.today(),
                        help="Retrieval date of the input exports (YYYY-MM-DD)")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    for resort_id in SELECTED_RUNS:
        source_path = getattr(args, resort_id)
        collection = {
            "type": "FeatureCollection",
            "name": f"SlopeSense — {resort_id.title()} selected downhill runs",
            "source": "© OpenStreetMap contributors",
            "license": "ODbL 1.0",
            "features": read_osm(source_path, resort_id, args.snapshot_date),
        }
        destination = args.output / f"{resort_id}.geojson"
        destination.write_text(json.dumps(collection, indent=2) + "\n")
        print(f"Wrote {len(collection['features'])} runs to {destination}")
        context = read_context(source_path, args.snapshot_date)
        context_path = args.output / f"{resort_id}-context.geojson"
        context_path.write_text(json.dumps(context, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
