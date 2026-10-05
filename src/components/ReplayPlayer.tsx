import type { Activity } from "../types/rider";
import { usePlayback } from "../hooks/usePlayback";
import { sampleAt, durationLabel } from "../engine/telemetry";
import { allTrails } from "../data/demo";
import { resortById, resorts } from "../data/resorts";
import { trailsByResort } from "../data/trails";
import { RunMap } from "./RunMap";
import { TelemetryChart } from "./TelemetryChart";
import { Icon } from "./Icon";
export function ReplayPlayer({
  activity,
  comparison,
}: {
  activity: Activity;
  comparison?: Activity;
}) {
  const samples = activity.telemetry,
    duration = samples.at(-1)?.time || 0,
    play = usePlayback(duration),
    point = sampleAt(samples, play.time),
    trail = allTrails.find((t) => t.id === activity.trailId),
    resort = activity.resortId ? resortById[activity.resortId] : resorts[0];
  return (
    <section className="replay-player">
      <div className="replay-player-heading">
        <div>
          <span className="eyebrow">
            {activity.simulated ? "DEMO REPLAY" : "YOUR GPS REPLAY"}
          </span>
          <h2>Ride it back.</h2>
        </div>
        <span className="replay-speed-readout">
          {point.speed.toFixed(1)}
          <small>km/h</small>
        </span>
      </div>
      <RunMap
        resort={resort}
        trails={activity.resortId ? trailsByResort[activity.resortId] : []}
        selectedTrail={trail}
        track={samples}
        rider={point}
      />
      <div className="playback-bar">
        <button
          className="playback-play"
          aria-label={play.playing ? "Pause replay" : "Play replay"}
          onClick={() => {
            if (play.time >= duration) play.seek(0);
            play.setPlaying(!play.playing);
          }}
        >
          <Icon name={play.playing ? "pause" : "play"} size={21} />
        </button>
        <div className="playback-timeline">
          <input
            type="range"
            aria-label="Replay position"
            min="0"
            max={duration}
            step="0.1"
            value={play.time}
            onChange={(e) => play.seek(Number(e.target.value))}
          />
          <div>
            <span>{durationLabel(play.time)}</span>
            <span>{durationLabel(duration)}</span>
          </div>
        </div>
        <select
          aria-label="Replay speed"
          value={play.rate}
          onChange={(e) => play.setRate(Number(e.target.value))}
        >
          {[1, 4, 8, 16].map((n) => (
            <option key={n} value={n}>
              {n}×
            </option>
          ))}
        </select>
      </div>
      <TelemetryChart
        samples={samples}
        time={play.time}
        comparison={comparison?.telemetry}
        onScrub={play.seek}
      />
    </section>
  );
}
