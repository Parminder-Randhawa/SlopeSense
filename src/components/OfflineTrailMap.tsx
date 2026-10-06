import { useEffect, useMemo, useRef, useState } from "react";
import type { Resort } from "../types/resort";
import type { SkiRun } from "../types/trail";
import type { Sample } from "../types/rider";
import { Icon } from "./Icon";
const emptyTrack: Sample[] = [];
const colors = {
  green: "#76c9a6",
  blue: "#85baf0",
  black: "#dfdce9",
  "double-black": "#bd98d4",
  unknown: "#8f9b9a",
};
type Props = {
  resort: Resort;
  trails: SkiRun[];
  selectedTrail: SkiRun | null;
  onSelectTrail: (t: SkiRun) => void;
  recommendedId?: string;
  rider?: Sample;
  compact?: boolean;
  lockCamera?: boolean;
  onClearSelection?: () => void;
  track?: Sample[];
};
export function OfflineTrailMap({
  resort,
  trails,
  selectedTrail,
  onSelectTrail,
  recommendedId,
  rider,
  compact,
  lockCamera = false,
  onClearSelection,
  track = emptyTrack,
}: Props) {
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const geometry = useMemo(() => {
    const all = trails.flatMap((t) =>
      t.geometry.type === "LineString"
        ? t.geometry.coordinates
        : t.geometry.coordinates.flat(),
    );
    all.push(...track.map((p) => [p.lng, p.lat]));
    if (!all.length)
      all.push(
        [resort.center.lng - 0.005, resort.center.lat - 0.005],
        [resort.center.lng + 0.005, resort.center.lat + 0.005],
      );
    if (all.length === 1) all.push([all[0][0] + 0.001, all[0][1] + 0.001]);
    const minLng = Math.min(...all.map((p) => p[0])),
      maxLng = Math.max(...all.map((p) => p[0]));
    const minLat = Math.min(...all.map((p) => p[1])),
      maxLat = Math.max(...all.map((p) => p[1]));
    const cos = Math.cos((resort.center.lat * Math.PI) / 180);
    const k = Math.min(
      660 / Math.max(0.0001, (maxLng - minLng) * cos),
      500 / Math.max(0.0001, maxLat - minLat),
    );
    const ox = (800 - (maxLng - minLng) * cos * k) / 2,
      oy = (650 - (maxLat - minLat) * k) / 2;
    const project = (lng: number, lat: number) => [
      ox + (lng - minLng) * cos * k,
      oy + (maxLat - lat) * k,
    ];
    const mapped = trails.map((trail) => {
      const lines =
        trail.geometry.type === "LineString"
          ? [trail.geometry.coordinates]
          : trail.geometry.coordinates;
      const longest = [...lines].sort((a, b) => b.length - a.length)[0];
      const pos = longest[Math.floor(longest.length * 0.45)];
      return {
        trail,
        label: project(pos[0], pos[1]),
        d: lines
          .map((line) =>
            line
              .map(
                ([lng, lat], i) =>
                  `${i ? "L" : "M"}${project(lng, lat).join(",")}`,
              )
              .join(" "),
          )
          .join(" "),
      };
    });
    return { mapped, project };
  }, [resort, trails, track]);
  useEffect(() => {
    if (!selectedTrail) {
      setView({ x: 0, y: 0, scale: 1 });
      return;
    }
    const coordinates =
      selectedTrail.geometry.type === "LineString"
        ? selectedTrail.geometry.coordinates
        : selectedTrail.geometry.coordinates.flat();
    const projected = coordinates.map(([lng, lat]) =>
      geometry.project(lng, lat),
    );
    const minX = Math.min(...projected.map((p) => p[0])),
      maxX = Math.max(...projected.map((p) => p[0]));
    const minY = Math.min(...projected.map((p) => p[1])),
      maxY = Math.max(...projected.map((p) => p[1]));
    const scale = Math.min(
      3.6,
      Math.max(
        1,
        Math.min(
          530 / Math.max(1, maxX - minX),
          420 / Math.max(1, maxY - minY),
        ),
      ),
    );
    setView({
      x: (400 - (minX + maxX) / 2) * scale,
      y: (325 - (minY + maxY) / 2) * scale,
      scale,
    });
  }, [selectedTrail, geometry]);
  const zoom = (factor: number) =>
    setView((v) => ({
      ...v,
      scale: Math.max(0.8, Math.min(5, v.scale * factor)),
    }));
  const position = rider ? geometry.project(rider.lng, rider.lat) : null;
  return (
    <div className={`terrain-map ${compact ? "compact" : ""}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 800 650"
        role="group"
        aria-label={`Interactive trail map for ${resort.name}`}
        className="terrain-canvas"
        onWheel={
          lockCamera ? undefined : (e) => zoom(e.deltaY < 0 ? 1.1 : 0.91)
        }
        onClick={() => onClearSelection?.()}
        onPointerDown={(e) => {
          if (lockCamera) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          const next = { x: e.clientX, y: e.clientY };
          if (Math.abs(next.x - prev.x) + Math.abs(next.y - prev.y) > 2) {
            moved.current = true;
            svgRef.current?.setPointerCapture(e.pointerId);
          }
          const other = [...pointers.current.entries()].find(
            ([id]) => id !== e.pointerId,
          )?.[1];
          if (other) {
            const a = Math.hypot(prev.x - other.x, prev.y - other.y),
              b = Math.hypot(next.x - other.x, next.y - other.y);
            if (a > 0) zoom(b / a);
          } else {
            const rect = svgRef.current!.getBoundingClientRect();
            const k = 800 / rect.width;
            setView((v) => ({
              ...v,
              x: Math.max(-1800, Math.min(1800, v.x + (next.x - prev.x) * k)),
              y: Math.max(-1800, Math.min(1800, v.y + (next.y - prev.y) * k)),
            }));
          }
          pointers.current.set(e.pointerId, next);
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (svgRef.current?.hasPointerCapture(e.pointerId))
            svgRef.current.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      >
        <defs>
          <radialGradient id={`terrain-${resort.id}`}>
            <stop stopColor="#253c3c" />
            <stop offset="1" stopColor="#111e23" />
          </radialGradient>
        </defs>
        <rect width="800" height="650" fill={`url(#terrain-${resort.id})`} />
        <g
          transform={`translate(${400 + view.x},${325 + view.y}) scale(${view.scale}) translate(-400,-325)`}
        >
          {geometry.mapped.map(({ trail, d, label }) => {
            const active = trail.id === selectedTrail?.id,
              recommended = trail.id === recommendedId;
            return (
              <g
                key={trail.id}
                role="button"
                tabIndex={0}
                aria-label={`Select ${trail.name}, ${trail.difficulty}`}
                className="map-trail"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!moved.current) onSelectTrail(trail);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectTrail(trail);
                  }
                }}
              >
                {(active || recommended) && (
                  <path
                    d={d}
                    fill="none"
                    stroke={active ? "#dcf9ed" : "#8cccb3"}
                    strokeWidth={active ? 13 : 10}
                    opacity=".16"
                  />
                )}
                <path d={d} fill="none" stroke="#0d171d" strokeWidth="6" />
                <path
                  d={d}
                  fill="none"
                  stroke={colors[trail.difficulty]}
                  strokeWidth={active ? 4 : 2.5}
                  opacity={selectedTrail && !active ? 0.13 : 0.95}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d={d} fill="none" stroke="transparent" strokeWidth="18" />
                <text pointerEvents="none"
                  x={label[0] + 8}
                  y={label[1] - 7}
                  fill={active ? "#fff" : "#bfcecc"}
                  fontSize={(active ? 20 : 15) / Math.sqrt(view.scale)}
                  opacity={active || recommended ? 1 : 0}
                  fontWeight={active ? 700 : 500}
                  paintOrder="stroke"
                  stroke="#132126"
                  strokeWidth="4"
                >
                  {recommended ? "★ " : ""}
                  {trail.name}
                </text>
              </g>
            );
          })}
          {track.length > 1 && (
            <path
              d={track
                .map(
                  (p, i) =>
                    `${i && !p.breakBefore ? "L" : "M"}${geometry.project(p.lng, p.lat).join(",")}`,
                )
                .join(" ")}
              fill="none"
              stroke="#eab28c"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {position && (
            <g
              data-testid="map-rider"
              transform={`translate(${position[0]},${position[1]})`}
              pointerEvents="none"
            >
              <circle
                r={22 / Math.sqrt(view.scale)}
                fill="#b3e3d0"
                opacity=".13"
              />
              <circle
                r={13 / Math.sqrt(view.scale)}
                fill="#338eda"
                stroke="#ffffff"
                strokeWidth="3"
              />
            </g>
          )}
        </g>
      </svg>
      <div className="map-caption">
        <span className="status-dot" /> Offline trail map{" "}
        <span>OSM geometry</span>
      </div>
      <div className="map-north">
        <span>N</span>
        <Icon name="compass" size={28} />
      </div>
      {!lockCamera && (
        <div className="map-controls">
          <button onClick={() => zoom(1.3)} aria-label="Zoom in">
            <Icon name="plus" />
          </button>
          <button onClick={() => zoom(1 / 1.3)} aria-label="Zoom out">
            <Icon name="minus" />
          </button>
          <button
            onClick={() => setView({ x: 0, y: 0, scale: 1 })}
            aria-label="Reset map view"
          >
            <Icon name="target" />
          </button>
        </div>
      )}
      <div className="map-attribution">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap
        </a>{" "}
        · Trail geometry only
      </div>
      <div className="map-difficulty">
        <span style={{ color: colors.green }}>● Green</span>
        <span style={{ color: colors.blue }}>■ Blue</span>
        <span style={{ color: colors.black }}>◆ Black</span>
        <span style={{ color: colors["double-black"] }}>◆◆</span>
      </div>
    </div>
  );
}
