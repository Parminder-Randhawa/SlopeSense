import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allTrails } from "../data/demo";
import { processGps } from "../engine/gps";
import { simulateRun } from "../engine/telemetry";
import {
  loadDraft,
  writeDraft,
  saveActivity,
  type Draft,
} from "../services/local";
import type { Activity, Feeling, Profile, Surface } from "../types/rider";
import type { GpsFix } from "../types/live";
export function useRecorder(onSaved: (activity: Activity) => void) {
  const [draft, setDraft] = useState<Draft | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [clock, setClock] = useState(Date.now()),
    [busy, setBusy] = useState(false);
  const current = useRef<Draft | null>(null),
    watch = useRef<number | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    gap = useRef(false),
    queue = useRef(Promise.resolve()),
    lease = useRef<WakeLockSentinel | null>(null);
  const commit = useCallback((d: Draft | null) => {
    current.current = d;
    setDraft(d);
    const snapshot = d ? structuredClone(d) : null;
    queue.current = queue.current
      .catch(() => {})
      .then(() => writeDraft(snapshot));
    queue.current.catch(() =>
      setError(
        "Could not save the draft on this device. Keep this tab open and export your ride before closing.",
      ),
    );
  }, []);
  const stopSources = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    void lease.current?.release();
    lease.current = null;
  }, []);
  const pause = useCallback(() => {
    stopSources();
    const d = current.current;
    if (d && d.activeSince !== null)
      commit({
        ...d,
        elapsedMs: d.elapsedMs + Date.now() - d.activeSince,
        activeSince: null,
      });
    gap.current = true;
  }, [commit, stopSources]);
  useEffect(() => {
    let mounted = true;
    loadDraft()
      .then((saved) => {
        if (!mounted) return;
        if (saved) {
          const lastTime = Date.parse(
            saved.fixes.at(-1)?.timestamp || saved.startedAt,
          );
          const activeDelta = saved.activeSince
            ? Math.max(0, lastTime - saved.activeSince)
            : 0;
          commit({
            ...saved,
            activeSince: null,
            elapsedMs: saved.elapsedMs + activeDelta,
          });
          gap.current = true;
          setError("Recovered your draft. Resume when you are ready.");
        }
        setReady(true);
      })
      .catch(() => {
        if (mounted) {
          setError(
            "Device storage is unavailable. Enable browser storage and reload to record.",
          );
          setReady(false);
        }
      });
    const tick = setInterval(() => setClock(Date.now()), 1000);
    return () => {
      mounted = false;
      clearInterval(tick);
      stopSources();
    };
  }, [commit, stopSources]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && current.current?.activeSince) {
        pause();
        setError(
          "Recording paused when the app went into the background. Resume to continue.",
        );
      }
    };
    const before = (e: BeforeUnloadEvent) => {
      if (current.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", before);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", before);
    };
  }, [pause]);
  const add = useCallback(
    (fix: GpsFix, cursor?: number) => {
      const d = current.current;
      if (!d || d.activeSince === null) return;
      fix.breakBefore = gap.current || fix.breakBefore;
      gap.current = false;
      commit({
        ...d,
        fixes: [...d.fixes, fix],
        demoCursor: cursor ?? d.demoCursor,
      });
    },
    [commit],
  );
  const run = useCallback(
    async (d: Draft) => {
      stopSources();
      setError("");
      commit({ ...d, activeSince: Date.now() });
      if (d.simulated) {
        const trail =
          allTrails.find((t) => t.id === d.trailId) ||
          allTrails.find((t) => t.id === "cypress-panorama")!;
        const samples = simulateRun(trail, "developing");
        let i = d.demoCursor;
        timer.current = setInterval(() => {
          const p = samples[i];
          if (!p) {
            pause();
            setError("Demo route complete. Finish to save your activity.");
            return;
          }
          add(
            {
              seq: i,
              timestamp: new Date(
                Date.parse(d.startedAt) + p.time * 1000,
              ).toISOString(),
              latitude: p.lat,
              longitude: p.lng,
              altitude: p.elevation,
              altitudeAccuracy: 3,
              accuracy: 3,
              speed: p.speed / 3.6,
              heading: null,
            },
            ++i,
          );
        }, 100);
        return;
      }
      if (!window.isSecureContext || !navigator.geolocation) {
        pause();
        setError(
          "Location requires localhost or HTTPS in a browser that supports GPS.",
        );
        return;
      }
      if ("wakeLock" in navigator)
        navigator.wakeLock
          .request("screen")
          .then((l) => {
            if (current.current?.activeSince) lease.current = l;
            else void l.release();
          })
          .catch(() => {});
      watch.current = navigator.geolocation.watchPosition(
        (p) => {
          const d = current.current;
          if (!d) return;
          add({
            seq: d.fixes.length,
            timestamp: new Date(p.timestamp).toISOString(),
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
            altitude: p.coords.altitude,
            altitudeAccuracy: p.coords.altitudeAccuracy,
            speed: p.coords.speed,
            heading: p.coords.heading,
          });
          setError("");
        },
        (e) => {
          setError(
            e.code === 1
              ? "Location access denied. Allow location for this site in your browser settings, then resume."
              : e.code === 2
                ? "GPS is unavailable. Move to an open area; waiting for a signal."
                : "GPS is taking longer than expected. Still waiting for a signal.",
          );
          if (e.code === 1) pause();
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    },
    [add, commit, pause, stopSources],
  );
  const start = useCallback(
    async (
      profile: Profile,
      simulated: boolean,
      trailId: string | null,
      mode: "auto" | "manual",
    ) => {
      if (current.current || !ready) return;
      const d: Draft = {
        id: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        sport: profile.sport,
        trailId,
        mode,
        simulated,
        fixes: [],
        elapsedMs: 0,
        activeSince: null,
        demoCursor: 0,
      };
      await run(d);
    },
    [ready, run],
  );
  const resume = useCallback(() => {
    if (current.current) void run(current.current);
  }, [run]);
  const stats = useMemo(
    () => processGps(draft?.fixes || [], allTrails),
    [draft?.fixes],
  );
  const finish = useCallback(
    async (feeling: Feeling, surface: Surface) => {
      const d = current.current;
      if (!d || busy) return;
      pause();
      const processed = processGps(d.fixes, allTrails);
      if (processed.samples.length < 2) {
        setError(
          "At least two usable GPS points are needed. Resume recording or discard this draft.",
        );
        return;
      }
      setBusy(true);
      const trailId =
        d.mode === "manual" ? d.trailId : processed.matchedTrailId;
      const trail = allTrails.find((t) => t.id === trailId);
      const a: Activity = {
        id: d.id,
        trailId: trail?.id || "",
        resortId: trail?.resortId || null,
        date: d.startedAt,
        persona: d.simulated ? "developing" : "recorded",
        simulated: d.simulated,
        sport: d.sport,
        feeling,
        surface,
        telemetry: processed.samples,
        selectionMode: d.mode,
        matchingConfidence: processed.confidence,
      };
      try {
        await queue.current;
        await saveActivity(a, true);
        current.current = null;
        setDraft(null);
        setError("");
        onSaved(a);
      } catch {
        setError(
          "Could not save the ride. Your draft is still available; try again or export the draft.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, onSaved, pause],
  );
  const discard = useCallback(async () => {
    stopSources();
    await queue.current.catch(() => {});
    try {
      await writeDraft(null);
      current.current = null;
      setDraft(null);
      setError("");
    } catch {
      setError("Could not clear the draft. Try again.");
    }
  }, [stopSources]);
  const elapsed = draft
    ? draft.elapsedMs +
      (draft.activeSince === null ? 0 : Math.max(0, clock - draft.activeSince))
    : 0;
  return {
    draft,
    ready,
    error,
    stats,
    start,
    resume,
    pause,
    finish,
    discard,
    busy,
    elapsed,
    recording: Boolean(draft?.activeSince),
  };
}
export type Recorder = ReturnType<typeof useRecorder>;
