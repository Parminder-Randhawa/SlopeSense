import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapType,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Resort } from "../types/resort";
import type { SkiRun } from "../types/trail";
import type { Sample } from "../types/rider";
import { trailsToFeatureCollection } from "../lib/trailParser";
import { OfflineTrailMap } from "./OfflineTrailMap";
import { Icon } from "./Icon";
import { useMapContext } from "../hooks/useMapContext";
import { mapStyle } from "../lib/mapStyle";
const colors = [
  "match",
  ["get", "difficulty"],
  "green",
  "#77cba5",
  "blue",
  "#75b7ee",
  "black",
  "#d4dce2",
  "double-black",
  "#bf9bde",
  "#86958b",
] as any;
function fitPadding(
  m: MapType,
  preferred:
    { top: number; bottom: number; left: number; right: number } | undefined,
  fallback: number,
) {
  const p = preferred || {
    top: fallback,
    bottom: fallback,
    left: fallback,
    right: fallback,
  };
  const height = m.getContainer().clientHeight,
    width = m.getContainer().clientWidth;
  const vertical = Math.min(1, (height * 0.65) / Math.max(1, p.top + p.bottom));
  const horizontal = Math.min(
    1,
    (width * 0.65) / Math.max(1, p.left + p.right),
  );
  return {
    top: p.top * vertical,
    bottom: p.bottom * vertical,
    left: p.left * horizontal,
    right: p.right * horizontal,
  };
}
const empty = {
  type: "FeatureCollection",
  features: [],
} as GeoJSON.FeatureCollection;
export function RunMap({
  resort,
  trails = [],
  selectedTrail,
  onSelectTrail,
  onClearSelection,
  lockCamera = false,
  showZoomControls = true,
  cameraPadding,
  track = [],
  rider,
}: {
  resort: Resort;
  trails?: SkiRun[];
  selectedTrail?: SkiRun | null;
  onSelectTrail?: (t: SkiRun) => void;
  onClearSelection?: () => void;
  lockCamera?: boolean;
  showZoomControls?: boolean;
  cameraPadding?: { top: number; bottom: number; left: number; right: number };
  track?: Sample[];
  rider?: Sample;
}) {
  const context = useMapContext(resort.id);
  const contextRef = useRef(context);
  contextRef.current = context;
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<MapType | null>(null),
    callbacks = useRef(onSelectTrail),
    clearCallback = useRef(onClearSelection),
    selectedRef = useRef(selectedTrail),
    trailRef = useRef(trails),
    fitted = useRef(false),
    paddingRef = useRef(cameraPadding);
  paddingRef.current = cameraPadding;
  callbacks.current = onSelectTrail;
  clearCallback.current = onClearSelection;
  selectedRef.current = selectedTrail;
  trailRef.current = trails;
  const [loaded, setLoaded] = useState(false),
    [offline, setOffline] = useState(false),
    [notice, setNotice] = useState(""),
    [locatedPoint, setLocatedPoint] = useState<Sample | null>(null),
    [locationTick, setLocationTick] = useState(0);
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
        scrollZoom: !lockCamera,
        boxZoom: !lockCamera,
        doubleClickZoom: !lockCamera,
        dragPan: !lockCamera,
        touchZoomRotate: !lockCamera,
        keyboard: !lockCamera,
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
    if (!lockCamera && showZoomControls)
      m.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
    m.addControl(
      new maplibregl.ScaleControl({ maxWidth: 75, unit: "metric" }),
      "bottom-right",
    );
    // Local geometry must not wait for remote basemap tiles to finish.
    m.once("style.load", () => {
      if (disposed) return;
      setLoaded(true);
      m.addSource("local-context", {
        type: "geojson",
        data: contextRef.current,
      });
      m.addLayer({
        id: "context-areas",
        type: "fill",
        source: "local-context",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": [
            "match",
            ["get", "kind"],
            "water",
            "#213e52",
            "building",
            "#3f5159",
            "#203833",
          ],
          "fill-opacity": 0.65,
        },
      });
      m.addLayer({
        id: "context-lines",
        type: "line",
        source: "local-context",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": [
            "match",
            ["get", "kind"],
            "lift",
            "#a3adb5",
            "connector",
            "#6d8d89",
            "stream",
            "#345c72",
            "#45585d",
          ],
          "line-width": [
            "match",
            ["get", "kind"],
            "connector",
            2,
            "lift",
            1.5,
            1,
          ],
          "line-opacity": 0.6,
        },
      });
      m.addLayer({
        id: "context-labels",
        type: "symbol",
        source: "local-context",
        filter: ["==", ["get", "kind"], "lift"],
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-padding": 15,
        },
        paint: {
          "text-color": "#9db2b8",
          "text-halo-color": "#101c23",
          "text-halo-width": 2,
        },
      });
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
          "line-color": "#0a141a",
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
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "symbol-spacing": 450,
          "text-padding": 10,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#d8e8e4",
          "text-halo-color": "#132027",
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
        m.fitBounds(bounds, {
          padding: fitPadding(m, paddingRef.current, 45),
          maxZoom: 15,
          duration: 0,
        });
      }
    });
    m.on("click", "trail-hit", (e) => {
      const t = trailRef.current.find(
        (t) => t.id === e.features?.[0]?.properties?.id,
      );
      if (t) callbacks.current?.(t);
    });
    m.on("click", (e) => {
      if (!m.getLayer("trail-hit")) return;
      if (!m.queryRenderedFeatures(e.point, { layers: ["trail-hit"] }).length)
        clearCallback.current?.();
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
    const observer = new ResizeObserver(() => {
      m.resize();
      const t = selectedRef.current;
      const visible = t ? [t] : trailRef.current;
      if (!visible.length) return;
      const bounds = new maplibregl.LngLatBounds();
      visible.forEach((t) =>
        (t.geometry.type === "LineString"
          ? t.geometry.coordinates
          : t.geometry.coordinates.flat()
        ).forEach((p) => bounds.extend([p[0], p[1]])),
      );
      m.fitBounds(bounds, {
        padding: fitPadding(m, paddingRef.current, t ? 65 : 45),
        maxZoom: t ? 16 : 15,
        duration: 0,
      });
    });
    observer.observe(container.current);
    return () => {
      disposed = true;
      observer.disconnect();
      m.remove();
      mapRef.current = null;
    };
  }, [resort.id, offline, lockCamera, showZoomControls]);
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
      id ? ["case", ["==", ["get", "id"], id], 1, 0.13] : 0.85,
    );
    m.setPaintProperty(
      "trail-halo",
      "line-opacity",
      id ? ["case", ["==", ["get", "id"], id], 0.9, 0.12] : 0.8,
    );
    if (selectedTrail) {
      const bounds = new maplibregl.LngLatBounds();
      (selectedTrail.geometry.type === "LineString"
        ? selectedTrail.geometry.coordinates
        : selectedTrail.geometry.coordinates.flat()
      ).forEach((p) => bounds.extend([p[0], p[1]]));
      m.fitBounds(bounds, {
        padding: fitPadding(m, paddingRef.current, 65),
        maxZoom: 16,
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 450,
      });
    } else if (trails.length && !track.length) {
      const bounds = new maplibregl.LngLatBounds();
      trails.forEach((t) =>
        (t.geometry.type === "LineString"
          ? t.geometry.coordinates
          : t.geometry.coordinates.flat()
        ).forEach((p) => bounds.extend([p[0], p[1]])),
      );
      m.fitBounds(bounds, {
        padding: fitPadding(m, paddingRef.current, 45),
        maxZoom: 15,
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 450,
      });
    }
  }, [selectedTrail, loaded, trails]);
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
    const p = rider || track.at(-1) || locatedPoint;
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
        m.fitBounds(bounds, {
          padding: fitPadding(m, paddingRef.current, 65),
          maxZoom: 16,
          duration: 400,
        });
      } else m.flyTo({ center: [p.lng, p.lat], zoom: 15 });
    }
  }, [track, rider, loaded, selectedTrail, locatedPoint]);
  useEffect(() => {
    const source = mapRef.current?.getSource("local-context") as
      GeoJSONSource | undefined;
    if (loaded && source) source.setData(context);
  }, [context, loaded]);
  const locate = () => {
    const p = rider || track.at(-1) || locatedPoint;
    if (p) {
      setLocationTick((t) => t + 1);
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
        setLocatedPoint({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          time: 0,
          speed: 0,
          distance: 0,
          elevation: 0,
          elevationKnown: false,
          gradient: 0,
          acceleration: 0,
          section: 0,
        });
        setLocationTick((t) => t + 1);
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
  const controls = (
    <div className="map-toolbar">
      {selectedTrail && onClearSelection && (
        <button className="map-all-runs" onClick={onClearSelection}>
          <Icon name="back" size={15} />
          All runs
        </button>
      )}
    </div>
  );
  return (
    <div
      className={`run-map ${offline ? "is-simple" : !loaded ? "is-loading" : ""} ${lockCamera ? "is-guided" : ""}`}
    >
      {(offline || !loaded) && (
        <OfflineTrailMap
          resort={resort}
          trails={trails}
          selectedTrail={selectedTrail || null}
          onSelectTrail={onSelectTrail || (() => {})}
          rider={rider || track.at(-1) || locatedPoint || undefined}
          centerOnRider={locationTick}
          track={track}
          lockCamera={lockCamera}
          showZoomControls={showZoomControls}
          onClearSelection={onClearSelection}
        />
      )}
      {!offline && (
        <div
          className="run-canvas"
          ref={container}
          aria-label={`Run map for ${resort.name}`}
        />
      )}
      {controls}
      {!lockCamera && (
        <div className="run-map-tools">
          <button onClick={locate} aria-label="Locate me">
            <Icon name="target" size={19} />
          </button>
        </div>
      )}
      {notice && (
        <div className="map-notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
