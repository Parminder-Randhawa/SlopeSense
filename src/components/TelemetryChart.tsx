import { useId, useState } from "react";
import type { Sample } from "../types/rider";
import { sampleAt } from "../engine/telemetry";
export function TelemetryChart({
  samples,
  time,
  comparison,
  onScrub,
}: {
  samples: Sample[];
  time?: number;
  comparison?: Sample[];
  onScrub?: (time: number) => void;
}) {
  const [mode, setMode] = useState("speed-distance");
  const id = useId().replace(/:/g, "");
  const last = samples.at(-1)!;
  const current = sampleAt(samples, time ?? last.time);
  const hasAltitude = samples.every((s) => s.elevationKnown !== false);
  const safeMode =
    !hasAltitude && (mode === "elevation" || mode === "gradient")
      ? "speed-distance"
      : mode;
  const yKey =
    safeMode === "elevation"
      ? "elevation"
      : safeMode === "gradient"
        ? "gradient"
        : "speed";
  const xKey = safeMode === "speed-time" ? "time" : "distance";
  const minY =
    yKey === "elevation"
      ? Math.floor(Math.min(...samples.map((s) => s.elevation)) / 50) * 50
      : 0;
  const maxY =
    Math.ceil(
      Math.max(
        ...samples.map((s) => s[yKey]),
        ...(comparison ?? []).map((s) => s[yKey]),
      ) / (yKey === "elevation" ? 50 : 10),
    ) * (yKey === "elevation" ? 50 : 10) || 10;
  const maxX = Math.max(last[xKey], comparison?.at(-1)?.[xKey] ?? 0);
  const x = (s: Sample) => 38 + (s[xKey] / Math.max(1, maxX)) * 516;
  const y = (s: Sample) =>
    139 - ((s[yKey] - minY) / Math.max(1, maxY - minY)) * 116;
  const visible = [...samples.filter((s) => s.time < current.time), current];
  const line = (points: Sample[]) =>
    points
      .map(
        (s, i) =>
          `${i && !s.breakBefore ? "L" : "M"}${x(s).toFixed(2)},${y(s).toFixed(2)}`,
      )
      .join(" ");
  const units = yKey === "elevation" ? "m" : yKey === "gradient" ? "%" : "km/h";
  return (
    <div className="telemetry-chart">
      <div className="chart-heading">
        <span>
          {yKey === "speed"
            ? "Speed"
            : yKey === "elevation"
              ? "Elevation"
              : "Gradient"}{" "}
          <small>vs {xKey}</small>
        </span>
        <select
          aria-label="Graph type"
          value={safeMode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="speed-distance">Speed / distance</option>
          <option value="elevation" disabled={!hasAltitude}>
            Elevation / distance
          </option>
          <option value="speed-time">Speed / time</option>
          <option value="gradient" disabled={!hasAltitude}>
            Gradient / distance
          </option>
        </select>
      </div>
      <svg
        viewBox="0 0 580 170"
        role="img"
        aria-label={`${yKey} versus ${xKey}, at ${Math.round(current.time)} seconds`}
        data-testid="telemetry-chart"
        onClick={(e) => {
          if (onScrub) {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(
              0,
              Math.min(
                1,
                (((e.clientX - rect.left) / rect.width) * 580 - 38) / 516,
              ),
            );
            const target = maxX * ratio;
            onScrub(samples.find((s) => s[xKey] >= target)?.time ?? last.time);
          }
        }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#a6d9c3" stopOpacity=".22" />
            <stop offset="1" stopColor="#a6d9c3" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1="38"
              x2="554"
              y1={139 - v * 116}
              y2={139 - v * 116}
              stroke="#ffffff12"
              strokeDasharray="3 5"
            />
            <text x="3" y={143 - v * 116} fill="#829594" fontSize="9">
              {Math.round(minY + v * (maxY - minY))}
            </text>
          </g>
        ))}
        <text x="3" y="12" fill="#829594" fontSize="9">
          {units}
        </text>
        <text x="38" y="162" fill="#829594" fontSize="9">
          0
        </text>
        <text x="554" y="162" textAnchor="end" fill="#829594" fontSize="9">
          {xKey === "time"
            ? `${Math.round(maxX)} sec`
            : `${(maxX / 1000).toFixed(2)} km`}
        </text>
        <path
          d={line(samples)}
          fill="none"
          stroke="#ffffff0d"
          strokeWidth="2"
        />
        {comparison && (
          <path
            d={line(comparison)}
            fill="none"
            stroke="#8aaacd"
            strokeWidth="1.7"
            strokeDasharray="5 4"
            opacity=".8"
          />
        )}
        <path
          d={`${line(visible)} L${x(current)},139 L38,139 Z`}
          fill={samples.some((s) => s.breakBefore) ? "none" : `url(#${id})`}
        />
        <path
          d={line(visible)}
          fill="none"
          stroke="#b2e3cd"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <line
          x1={x(current)}
          x2={x(current)}
          y1="20"
          y2="139"
          stroke="#d2f3e3"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity=".6"
        />
        <circle cx={x(current)} cy={y(current)} r="4" fill="#d4f6e7" />
      </svg>
    </div>
  );
}
