import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapType,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Resort } from "../types/resort";
import type { SkiRun } from "../types/trail";
import type { Sample } from "../types/rider";
import { trailsToFeatureCollection } from "../lib/trailParser";
import { OfflineTrailMap } from "./OfflineTrailMap";
import { Icon } from "./Icon";
const colors = [
  "match",
  ["get", "difficulty"],
  "green",
  "#399270",
  "blue",
  "#367bc0",
  "black",
  "#41485b",
  "double-black",
  "#80559c",
  "#86958b",
] as any;
const empty = {
  type: "FeatureCollection",
  features: [],
} as GeoJSON.FeatureCollection;
export function mapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      context: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
      },
    },
    layers: [
      {
        id: "paper",
        type: "background",
        paint: { "background-color": "#e9eddf" },
      },
      {
        id: "map-context",
        source: "context",
        type: "raster",
        paint: {
          "raster-saturation": -0.8,
          "raster-opacity": 0.48,
          "raster-contrast": -0.2,
        },
      },
    ],
  };
}
export function RunMap({
  resort,
  trails = [],
  selectedTrail,
  onSelectTrail,
  track = [],
  rider,
}: {
  resort: Resort;
  trails?: SkiRun[];
  selectedTrail?: SkiRun | null;
  onSelectTrail?: (t: SkiRun) => void;
  track?: Sample[];
  rider?: Sample;
}) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<MapType | null>(null),
    callbacks = useRef(onSelectTrail),
    trailRef = useRef(trails),
    fitted = useRef(false);
  callbacks.current = onSelectTrail;
  trailRef.current = trails;
  const [loaded, setLoaded] = useState(false),
    [offline, setOffline] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!container.current || offline) return;
    setLoaded(false);
    fitted.current = false;
    let m: MapType;
    let disposed = false;
    try {
      m = new maplibregl.Map({
        container: container.current,
        style: mapStyle(),
        center: [resort.center.lng, resort.center.lat],
        zoom: resort.defaultZoom,
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
        maxPitch: 0,
        renderWorldCopies: false,
      });
    } catch {
      setOffline(true);
      return;
    }
    mapRef.current = m;
    m.touchZoomRotate.disableRotation();
    m.addControl(
      new maplibregl.AttributionControl({ compact: false }),
      "bottom-left",
    );
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    m.addControl(
      new maplibregl.ScaleControl({ maxWidth: 75, unit: "metric" }),
      "bottom-right",
    );
    m.on("load", () => {
      if (disposed) return;
      setLoaded(true);
      m.addSource("trails", {
        type: "geojson",
        data: trailsToFeatureCollection(trailRef.current),
      });
      m.addLayer({
        id: "trail-halo",
        type: "line",
        source: "trails",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.8,
        },
      });
      m.addLayer({
        id: "trail-lines",
        type: "line",
        source: "trails",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": colors,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 15, 3.5],
        },
      });
      m.addLayer({
        id: "trail-hit",
        type: "line",
        source: "trails",
        paint: { "line-color": "#ffffff", "line-opacity": 0, "line-width": 22 },
      });
      m.addLayer({
        id: "selected-halo",
        type: "line",
        source: "trails",
        filter: ["==", ["get", "id"], ""],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#e2a675",
          "line-width": 16,
          "line-opacity": 0.25,
        },
      });
      m.addLayer({
        id: "selected-line",
        type: "line",
        source: "trails",
        filter: ["==", ["get", "id"], ""],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#d97242", "line-width": 4.5 },
      });
      m.addLayer({
        id: "trail-labels",
        type: "symbol",
        source: "trails",
        minzoom: 13.5,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular"],
          "text-size": 12,
          "symbol-spacing": 450,
          "text-padding": 10,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#374941",
          "text-halo-color": "#f6f7ed",
          "text-halo-width": 2,
        },
      });
      m.addSource("track", { type: "geojson", data: empty });
      m.addLayer({
        id: "track-halo",
        type: "line",
        source: "track",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#fffdf4", "line-width": 8 },
      });
      m.addLayer({
        id: "recorded-track",
        type: "line",
        source: "track",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#d96f3d", "line-width": 4 },
      });
      m.addSource("rider", { type: "geojson", data: empty });
      m.addLayer({
        id: "rider-glow",
        type: "circle",
        source: "rider",
        paint: {
          "circle-radius": 19,
          "circle-color": "#318ae0",
          "circle-opacity": 0.16,
        },
      });
      m.addLayer({
        id: "rider-point",
        type: "circle",
        source: "rider",
        paint: {
          "circle-radius": 7,
          "circle-color": "#338eda",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
      if (trailRef.current.length) {
        const bounds = new maplibregl.LngLatBounds();
        trailRef.current.forEach((t) =>
          (t.geometry.type === "LineString"
            ? t.geometry.coordinates
            : t.geometry.coordinates.flat()
          ).forEach((p) => bounds.extend([p[0], p[1]])),
        );
        m.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 0 });
      }
    });
    m.on("click", "trail-hit", (e) => {
      const t = trailRef.current.find(
        (t) => t.id === e.features?.[0]?.properties?.id,
      );
      if (t) callbacks.current?.(t);
    });
    m.on("mouseenter", "trail-hit", () => {
      m.getCanvas().style.cursor = "pointer";
    });
    m.on("mouseleave", "trail-hit", () => {
      m.getCanvas().style.cursor = "";
    });
    let errors = 0;
    m.on("error", () => {
      if (!disposed && ++errors > 3)
        setNotice("Map detail unavailable · your run geometry is still shown.");
    });
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(container.current);
    return () => {
      disposed = true;
      observer.disconnect();
      m.remove();
      mapRef.current = null;
    };
  }, [resort.id, offline]);
  useEffect(() => {
    const m = mapRef.current;
    if (loaded && m?.getSource("trails"))
      (m.getSource("trails") as GeoJSONSource).setData(
        trailsToFeatureCollection(trails),
      );
  }, [trails, loaded]);
  useEffect(() => {
    const m = mapRef.current;
    if (!loaded || !m?.getLayer("selected-line")) return;
    const id = selectedTrail?.id || "";
    m.setFilter("selected-line", ["==", ["get", "id"], id]);
    m.setFilter("selected-halo", ["==", ["get", "id"], id]);
    m.setFilter("trail-labels", id ? ["==", ["get", "id"], id] : null);
    m.setPaintProperty(
      "trail-lines",
      "line-opacity",
      id ? ["case", ["==", ["get", "id"], id], 1, 0.28] : 0.85,
    );
    if (selectedTrail) {
      const bounds = new maplibregl.LngLatBounds();
      (selectedTrail.geometry.type === "LineString"
        ? selectedTrail.geometry.coordinates
        : selectedTrail.geometry.coordinates.flat()
      ).forEach((p) => bounds.extend([p[0], p[1]]));
      m.fitBounds(bounds, {
        padding: 65,
        maxZoom: 16,
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 450,
      });
    }
  }, [selectedTrail, loaded]);
  useEffect(() => {
    const m = mapRef.current;
    if (!loaded || !m?.getSource("track")) return;
    const lines: number[][][] = [];
    for (const p of track) {
      if (!lines.length || p.breakBefore) lines.push([]);
      lines.at(-1)!.push([p.lng, p.lat]);
    }
    (m.getSource("track") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: lines
        .filter((l) => l.length > 1)
        .map((coordinates) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        })),
    });
    const p = rider || track.at(-1);
    (m.getSource("rider") as GeoJSONSource).setData(
      p
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          }
        : empty,
    );
    if (p && !fitted.current && !selectedTrail) {
      fitted.current = true;
      if (track.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        track.forEach((p) => bounds.extend([p.lng, p.lat]));
        m.fitBounds(bounds, { padding: 65, maxZoom: 16, duration: 400 });
      } else m.flyTo({ center: [p.lng, p.lat], zoom: 15 });
    }
  }, [track, rider, loaded, selectedTrail]);
  const locate = () => {
    const p = rider || track.at(-1);
    if (p) {
      mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 15 });
      return;
    }
    if (!navigator.geolocation) {
      setNotice("Location is not supported.");
      return;
    }
    setNotice("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setNotice("");
        const m = mapRef.current;
        m?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 15 });
        if (m?.getSource("rider"))
          (m.getSource("rider") as GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [p.coords.longitude, p.coords.latitude],
            },
          });
      },
      (e) =>
        setNotice(
          e.code === 1
            ? "Allow location in browser settings to locate yourself."
            : "Location is currently unavailable.",
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  if (offline)
    return (
      <OfflineTrailMap
        resort={resort}
        trails={trails}
        selectedTrail={selectedTrail || null}
        onSelectTrail={onSelectTrail || (() => {})}
        rider={rider || track.at(-1)}
        track={track}
      />
    );
  return (
    <div className="run-map">
      <div
        className="run-canvas"
        ref={container}
        aria-label={`Run map for ${resort.name}`}
      />
      <div className="run-map-tools">
        <button onClick={locate} aria-label="Locate me">
          <Icon name="target" size={19} />
        </button>
      </div>
      <button className="map-fallback-button" onClick={() => setOffline(true)}>
        Simple map
      </button>
      {notice && (
        <div className="map-notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
