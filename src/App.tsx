import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Icon } from "./components/Icon";
import { Home } from "./pages/Home";
import { Progress } from "./pages/Progress";
import { Profile } from "./pages/Profile";
import { allTrails } from "./data/demo";
import { rankTrails, type Fit } from "./engine/recommendations";
import {
  loadPreferences,
  ensureDemoActivities,
  savePreferences,
  loadActivities,
  download,
} from "./services/local";
import { useWeather } from "./hooks/useWeather";
import { useRecorder } from "./hooks/useRecorder";
import type { Activity, Profile as RiderProfile } from "./types/rider";
import type { ResortId } from "./types/resort";
import type { SkiRun } from "./types/trail";
import "./styles.css";
import "./live.css";
import "./personal.css";
import "./ride.css";
const Mountain = lazy(() =>
  import("./pages/Mountain").then((module) => ({ default: module.Mountain })),
);
const RecordPage = lazy(() =>
  import("./pages/Record").then((module) => ({ default: module.RecordPage })),
);
const ActivityPage = lazy(() =>
  import("./pages/Activity").then((module) => ({
    default: module.ActivityPage,
  })),
);
const nav = [
  { id: "home", label: "Home", icon: "home" },
  { id: "explore", label: "Explore", icon: "compass" },
  { id: "record", label: "Record", icon: "record" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "profile", label: "Profile", icon: "user" },
];
export default function App() {
  const [prefs, setPrefs] = useState(loadPreferences),
    [allActivities, setActivities] = useState<Activity[]>([]),
    [page, setPage] = useState("home"),
    [resortId, setResortId] = useState<ResortId>("cypress"),
    [selected, setSelected] = useState<SkiRun | null>(null),
    [activityOrigin, setActivityOrigin] = useState("home"),
    [activity, setActivity] = useState<Activity | null>(null),
    [warning, setWarning] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [intro, setIntro] = useState(
      !matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const { weather, loading, error, refresh } = useWeather(prefs.demo),
    activities = allActivities.filter((a) => a.simulated === prefs.demo);
  const onSaved = useCallback((a: Activity) => {
    setActivityOrigin("record");
    setActivities((list) => [...list.filter((x) => x.id !== a.id), a]);
    setActivity(a);
    setPage("activity");
    window.scrollTo(0, 0);
  }, []);
  const recorder = useRecorder(onSaved);
  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), 1100);
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  useEffect(() => {
    let alive = true;
    (prefs.demo ? ensureDemoActivities() : loadActivities())
      .then((list) => {
        if (alive) setActivities(list);
      })
      .catch(() =>
        setWarning("Could not read saved rides. Check browser storage."),
      );
    return () => {
      alive = false;
    };
  }, [prefs.demo]);
  const fits = useMemo(
    () => rankTrails(allTrails, prefs.profile, activities, weather),
    [prefs, allActivities, weather],
  );
  const navigate = (target: string) => {
    setPage(target);
    if (target === "activity") {
      setActivityOrigin(page === "activity" ? activityOrigin : page);
      setActivity(null);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openMountain = (id: ResortId) => {
    setResortId(id);
    setSelected(null);
    navigate("explore");
  };
  const openTrail = (fit: Fit) => {
    setResortId(fit.trail.resortId);
    setSelected(fit.trail);
    navigate("explore");
  };
  const updatePrefs = (profile: RiderProfile, demo = prefs.demo) => {
    const next = {
      ...prefs,
      demo,
      profile:
        demo === prefs.demo
          ? profile
          : demo
            ? prefs.demoProfile
            : prefs.liveProfile,
    };
    if (demo === prefs.demo) {
      if (demo) next.demoProfile = profile;
      else next.liveProfile = profile;
    }
    setPrefs(next);
    try {
      savePreferences(next);
    } catch {
      setWarning("Preferences could not be saved. Check browser storage.");
    }
  };
  const openActivity = (a: Activity) => {
    setActivityOrigin(page);
    setActivity(a);
    setPage("activity");
    window.scrollTo(0, 0);
  };
  return (
    <div className="app-shell live-shell">
      {intro && (
        <div className="launch-animation" aria-hidden="true">
          <Icon name="mountain" size={75} />
          <span>
            SlopeSense<span className="brand-dot">.</span>
          </span>
          <i />
        </div>
      )}
      <header className="app-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="SlopeSense home"
        >
          <Icon name="mountain" size={30} />
          <span>
            SlopeSense<span className="brand-dot">.</span>
          </span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`${page === n.id ? "active" : ""} ${n.id === "record" ? "record-nav" : ""}`}
              aria-label={n.label}
              title={n.label}
              onClick={() => navigate(n.id)}
            >
              <Icon name={n.icon} size={18} />
              {n.id !== "record" && n.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <span className={`mode-badge ${prefs.demo ? "demo" : ""}`}>
            <span className="status-dot" />
            {prefs.demo ? "DEMO" : "LOCAL"}
          </span>
          <button
            className="avatar"
            aria-label="Open profile and settings"
            onClick={() => navigate("profile")}
          >
            {prefs.profile.name[0]?.toUpperCase() || "R"}
          </button>
        </div>
      </header>
      {prefs.demo && (
        <div className="mode-ribbon">
          DEMO MODE{" "}
          <span>Sample profile, rides & weather · exit in Settings</span>
        </div>
      )}
      {!online && (
        <div className="storage-warning">
          Offline · GPS and saved rides work; fresh weather and uncached map
          tiles need internet.
        </div>
      )}
      {warning && (
        <div className="storage-warning" role="status">
          {warning}
          <button onClick={() => setWarning("")} aria-label="Dismiss notice">
            ×
          </button>
        </div>
      )}
      {error && !prefs.demo && (
        <div className="weather-error" role="status">
          {error}{" "}
          {weather.cypress.available
            ? "Showing cached estimates."
            : "No estimated conditions available."}
          <button onClick={refresh}>Retry</button>
        </div>
      )}
      {recorder.draft && page !== "record" && (
        <button
          className="active-recording-banner"
          onClick={() => navigate("record")}
        >
          <span className="status-dot" />
          {recorder.recording ? "Recording your ride" : "Paused ride saved"} ·
          Return to recording
          <Icon name="arrow" size={16} />
        </button>
      )}
      <main
        className={`main-content ${page === "home" ? "home-content" : page === "record" ? "record-content" : ""}`}
      >
        <Suspense
          fallback={
            <div className="page-loading" role="status">
              Loading your map…
            </div>
          }
        >
          {page === "home" && (
            <Home
              profile={prefs.profile}
              activities={activities}
              fits={fits}
              weather={weather}
              demo={prefs.demo}
              openMountain={openMountain}
              openTrail={openTrail}
              onNavigate={navigate}
            />
          )}
          {page === "explore" && (
            <Mountain
              resortId={resortId}
              selected={selected}
              fits={fits}
              profile={prefs.profile}
              weather={weather[resortId]}
              onResort={openMountain}
              onSelect={setSelected}
              onRecord={(t) => {
                setSelected(t);
                navigate("record");
              }}
              onRefresh={refresh}
              loading={loading}
            />
          )}
          {page === "record" && (
            <RecordPage
              key={`${prefs.demo}-${selected?.id || "auto"}`}
              recorder={recorder}
              profile={prefs.profile}
              demo={prefs.demo}
              selected={selected}
              onHistory={() => navigate("activity")}
              onSport={(sport) => updatePrefs({ ...prefs.profile, sport })}
            />
          )}
          {page === "activity" && (
            <ActivityPage
              activities={activities}
              selected={activity}
              onSelect={(a) => {
                setActivity(a);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              backLabel={
                nav.find((n) => n.id === activityOrigin)?.label || "Home"
              }
              onBack={() => navigate(activityOrigin)}
              onExplore={() => navigate("record")}
            />
          )}
          {page === "progress" && (
            <Progress
              activities={activities}
              profile={prefs.profile}
              onActivity={openActivity}
              onTrail={(trail) => {
                setResortId(trail.resortId);
                setSelected(trail);
                navigate("explore");
              }}
            />
          )}
          {page === "profile" && (
            <Profile
              key={String(prefs.demo)}
              profile={prefs.profile}
              activities={activities}
              onActivity={openActivity}
              onSave={(p) => updatePrefs(p)}
              demo={prefs.demo}
              onDemo={(v) => {
                if (!recorder.draft) {
                  updatePrefs(prefs.profile, v);
                  setSelected(null);
                }
              }}
              locked={Boolean(recorder.draft)}
              onHistory={() => navigate("activity")}
              onExport={() =>
                download(
                  "slopesense-backup.json",
                  JSON.stringify(
                    {
                      version: 3,
                      profile: prefs.profile,
                      activities: allActivities,
                    },
                    null,
                    2,
                  ),
                )
              }
            />
          )}
        </Suspense>
        <footer className="app-footer">
          <span>
            <Icon name="mountain" size={16} /> North Shore, British Columbia
          </span>
          <button onClick={() => navigate("profile")}>
            Data sources & settings ↗
          </button>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map((n) => (
          <button
            key={n.id}
            className={`${page === n.id ? "active" : ""} ${n.id === "record" ? "record-nav" : ""}`}
            onClick={() => {
              if (n.id === "record" && page !== "explore") setSelected(null);
              navigate(n.id);
            }}
          >
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
