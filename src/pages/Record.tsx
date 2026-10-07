import { useState } from "react";
import type { Recorder } from "../hooks/useRecorder";
import type { Feeling, Profile, Surface } from "../types/rider";
import type { SkiRun } from "../types/trail";
import { allTrails } from "../data/demo";
import { resortById, resorts } from "../data/resorts";
import { trailsByResort } from "../data/trails";
import { RunMap } from "../components/RunMap";
import { Icon } from "../components/Icon";
import { durationLabel, analyze } from "../engine/telemetry";
import { RunPicker } from "../components/RunPicker";
import { DifficultyPill } from "../components/Shared";
import { download } from "../services/local";
export function RecordPage({
  recorder: r,
  profile,
  demo,
  selected,
  onHistory,
  onSport,
}: {
  recorder: Recorder;
  profile: Profile;
  demo: boolean;
  selected: SkiRun | null;
  onHistory: () => void;
  onSport: (sport: Profile["sport"]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">(
      selected ? "manual" : "auto",
    ),
    [trailId, setTrailId] = useState(selected?.id || "cypress-panorama"),
    [finishing, setFinishing] = useState(false),
    [discarding, setDiscarding] = useState(false),
    [feeling, setFeeling] = useState<Feeling>("unreported"),
    [surface, setSurface] = useState<Surface>("unknown");
  const chosen = allTrails.find((t) => t.id === (r.draft?.trailId || trailId)),
    matched = allTrails.find((t) => t.id === r.stats.matchedTrailId),
    mountain =
      r.draft?.mode === "auto" && matched
        ? resortById[matched.resortId]
        : chosen
          ? resortById[chosen.resortId]
          : resorts[0],
    last = r.stats.samples.at(-1),
    stats = analyze(r.stats.samples);
  const duration = r.draft?.simulated ? last?.time || 0 : r.elapsed / 1000;
  return (
    <div className="record-page page-enter">
      <div className="record-title">
        <div>
          <p className="eyebrow">
            {demo ? "DEMO · SIMULATED GPS" : "GPS ACTIVITY"}
          </p>
          <h1>{r.draft ? "Recording your ride" : "Let’s ride."}</h1>
        </div>
        <button className="secondary" onClick={onHistory}>
          <Icon name="activity" size={17} />
          Rides & replays
        </button>
      </div>
      <div className="record-map-wrap">
        <RunMap
          key={mountain.id}
          resort={mountain}
          trails={trailsByResort[mountain.id]}
          selectedTrail={
            demo ||
            r.draft?.mode === "manual" ||
            (!r.draft && mode === "manual")
              ? chosen
              : null
          }
          track={r.stats.samples}
          showZoomControls={false}
          cameraPadding={{ top: 100, bottom: 270, left: 35, right: 35 }}
        />
        <div
          className={`gps-status ${r.recording ? "is-recording" : ""}`}
          role="status"
        >
          <i />
          {r.draft
            ? r.recording
              ? last
                ? r.draft.simulated
                  ? "Simulated GPS · 10× playback"
                  : `GPS ±${Math.round(last.accuracy || 0)} m`
                : "Waiting for GPS…"
              : "Recording paused"
            : "Location starts when you press Start"}
        </div>
      </div>
      {picking && (
        <RunPicker
          value={trailId}
          onPick={setTrailId}
          onClose={() => setPicking(false)}
        />
      )}
      <section className="record-console">
        <div className="record-metrics">
          <div>
            <strong>{durationLabel(duration)}</strong>
            <span>{r.draft?.simulated ? "Simulated time" : "Active time"}</span>
          </div>
          <div>
            <strong>{(stats.distance / 1000).toFixed(2)}</strong>
            <span>Distance · km</span>
          </div>
          <div>
            <strong>{last ? last.speed.toFixed(1) : "—"}</strong>
            <span>Speed · km/h</span>
          </div>
        </div>
        {r.error && (
          <p className="inline-notice" role="status">
            {r.error}
          </p>
        )}
        {r.stats.rejected > 0 && (
          <p className="fine-print">
            {r.stats.rejected} inaccurate or implausible GPS points excluded.
          </p>
        )}
        {!r.draft ? (
          <>
            <div className="record-setup-new">
              <div
                className="record-mode-tabs"
                role="group"
                aria-label="Run selection"
              >
                <button
                  className={mode === "auto" ? "active" : ""}
                  aria-pressed={mode === "auto"}
                  onClick={() => setMode("auto")}
                >
                  <Icon name="target" size={16} />
                  Auto-detect
                </button>
                <button
                  className={mode === "manual" ? "active" : ""}
                  aria-pressed={mode === "manual"}
                  onClick={() => setMode("manual")}
                >
                  <Icon name="compass" size={16} />
                  Choose a run
                </button>
              </div>
              {mode === "manual" || demo ? (
                <button
                  className="selected-run-control"
                  onClick={() => setPicking(true)}
                  aria-label="Choose recording run"
                >
                  <span className="selected-run-icon">
                    <Icon name="mountain" size={23} />
                  </span>
                  <span>
                    <small>
                      {demo ? "DEMO ROUTE" : mountain.shortName.toUpperCase()}
                    </small>
                    <strong>{chosen?.name || "Select a run"}</strong>
                    <span>
                      {chosen && (
                        <DifficultyPill difficulty={chosen.difficulty} />
                      )}
                      <small>
                        {((chosen?.lengthMeters || 0) / 1000).toFixed(2)} km
                      </small>
                    </span>
                  </span>
                  <Icon name="chevron" size={18} />
                </button>
              ) : (
                <p className="auto-hint">
                  Start riding. Your GPS track will be matched to a run when
                  there is enough evidence.
                </p>
              )}
            </div>
            <div className="start-row">
              <label className="record-sport">
                <Icon name="mountain" size={17} />
                <select
                  aria-label="Recording sport"
                  value={profile.sport}
                  onChange={(e) => onSport(e.target.value as Profile["sport"])}
                >
                  <option value="ski">Skiing</option>
                  <option value="snowboard">Snowboarding</option>
                </select>
              </label>
              <button
                className="record-start"
                aria-label={demo ? "Start demo activity" : "Start activity"}
                disabled={!r.ready}
                onClick={() =>
                  r.start(
                    profile,
                    demo,
                    mode === "manual" || demo ? trailId : null,
                    mode,
                  )
                }
              >
                <Icon name="record" size={25} />
                <span>Start recording</span>
              </button>
              <span className="record-source">
                {demo ? "Demo GPS" : "Device GPS"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="detected-run">
              <Icon name="location" size={17} />
              {r.draft.mode === "manual"
                ? `Selected: ${chosen?.name || "Unknown run"}`
                : matched
                  ? `GPS match: ${matched.name} · ${Math.round(r.stats.confidence * 100)}% of moving fixes`
                  : "Auto-detecting · no confident run match yet"}
            </div>
            {!finishing ? (
              <div className="record-actions">
                {r.recording ? (
                  <button className="secondary" onClick={r.pause}>
                    <Icon name="pause" />
                    Pause
                  </button>
                ) : (
                  <button className="primary" onClick={r.resume}>
                    <Icon name="play" />
                    Resume
                  </button>
                )}
                <button
                  className="finish-button"
                  onClick={() => {
                    r.pause();
                    setFinishing(true);
                  }}
                >
                  Finish ride
                  <Icon name="check" />
                </button>
              </div>
            ) : (
              <div className="finish-form">
                <h2>How did it feel?</h2>
                <div className="chips">
                  {(["easy", "right", "hard", "unreported"] as Feeling[]).map(
                    (f) => (
                      <button
                        key={f}
                        className={`chip ${feeling === f ? "selected" : ""}`}
                        onClick={() => setFeeling(f)}
                      >
                        {f === "right"
                          ? "Just right"
                          : f === "unreported"
                            ? "Skip"
                            : f}
                      </button>
                    ),
                  )}
                </div>
                <label htmlFor="surface-report">
                  Surface report · optional
                </label>
                <select
                  id="surface-report"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value as Surface)}
                >
                  {(
                    [
                      "unknown",
                      "soft",
                      "normal",
                      "firm",
                      "variable",
                    ] as Surface[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s === "unknown" ? "Not reported" : s}
                    </option>
                  ))}
                </select>
                <div className="record-actions">
                  <button
                    className="secondary"
                    onClick={() => setFinishing(false)}
                  >
                    Back
                  </button>
                  <button
                    className="primary"
                    disabled={r.busy}
                    onClick={() => r.finish(feeling, surface)}
                  >
                    {r.busy ? "Saving…" : "Save activity"}
                    <Icon name="check" />
                  </button>
                </div>
              </div>
            )}
            <div className="draft-actions">
              <button
                className="text-button"
                onClick={() => setDiscarding(true)}
              >
                Discard draft
              </button>
              <button
                className="text-button"
                onClick={() =>
                  download(
                    `slopesense-draft-${r.draft!.id}.json`,
                    JSON.stringify(r.draft, null, 2),
                  )
                }
              >
                Export draft
              </button>
            </div>
            {discarding && (
              <div className="inline-confirm">
                <p>Discard this recording from this device?</p>
                <button
                  className="secondary"
                  onClick={() => setDiscarding(false)}
                >
                  Keep it
                </button>
                <button
                  className="danger-button"
                  onClick={async () => {
                    await r.discard();
                    setDiscarding(false);
                    setFinishing(false);
                  }}
                >
                  Discard recording
                </button>
              </div>
            )}
          </>
        )}
        <details className="record-guidance">
          <summary>Recording tips & privacy</summary>
          <p className="record-footnote">
            {demo
              ? "Simulated fixes travel through the same GPS filtering, matching and analysis as live rides. Saved demo rides stay separate."
              : "Keep the app visible while recording. It pauses in the background; a browser cannot reliably record with your phone locked. Routes stay on this device."}
          </p>
        </details>
      </section>
    </div>
  );
}
