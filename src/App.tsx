import { useEffect, useMemo, useState } from "react";
import { Icon } from "./components/Icon";
import { Onboarding } from "./components/ProfileForm";
import { Home } from "./pages/Home";
import { Mountain } from "./pages/Mountain";
import { Replay } from "./pages/Replay";
import { ActivityPage } from "./pages/Activity";
import { Progress } from "./pages/Progress";
import { Profile } from "./pages/Profile";
import {
  allTrails,
  demoProfile,
  initialState,
  seedActivities,
} from "./data/demo";
import { conditions } from "./data/conditions";
import { rankTrails, type Fit } from "./engine/recommendations";
import { readState, saveState } from "./engine/storage";
import type { Activity, Profile as RiderProfile } from "./types/rider";
import type { ResortId } from "./types/resort";
import type { SkiRun } from "./types/trail";
import "./styles.css";
const nav = [
  { id: "home", label: "Home", icon: "home" },
  { id: "explore", label: "Explore", icon: "compass" },
  { id: "activity", label: "Activity", icon: "activity" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "profile", label: "Profile", icon: "user" },
];
function App() {
  const [loaded] = useState(readState);
  const [state, setState] = useState(loaded.state);
  const [warning, setWarning] = useState(loaded.warning);
  const [page, setPage] = useState("home");
  const [resortId, setResortId] = useState<ResortId>("cypress");
  const [selected, setSelected] = useState<SkiRun | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [replay, setReplay] = useState<{
    trail: SkiRun;
    auto: boolean;
    key: number;
  } | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const fits = useMemo(
    () => rankTrails(allTrails, state.profile, state.activities, conditions),
    [state.profile, state.activities],
  );
  useEffect(() => {
    const error = saveState(state);
    if (error) setWarning(error);
  }, [state]);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  const navigate = (target: string) => {
    setPage(target);
    setReplay(null);
    if (target === "activity") setActivity(null);
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
  const openActivity = (a: Activity) => {
    setPage("activity");
    setReplay(null);
    setActivity(a);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const saveProfile = (profile: RiderProfile) =>
    setState((s) => ({ ...s, profile }));
  const ask = (text: string) => {
    const input = text.trim().toLowerCase();
    if (!input)
      return "Try “something easier”, “a longer run”, “avoid firm snow”, or “where should I go?”.";
    let profile = {
        ...state.profile,
        preferences: [...state.profile.preferences],
      },
      recognized = false;
    const add = (
      p: RiderProfile["preferences"][number],
      opposite?: RiderProfile["preferences"][number],
    ) => {
      profile.preferences = [
        ...new Set([...profile.preferences.filter((x) => x !== opposite), p]),
      ];
      recognized = true;
    };
    if (/easy|easier|relax|gentle/.test(input)) {
      profile.goal = "relax";
      add("gentle", "steep");
    }
    if (/harder|challenge|improve/.test(input)) {
      profile.goal = "improve";
      recognized = true;
    }
    if (/long/.test(input)) add("long", "short");
    if (/short/.test(input)) add("short", "long");
    if (/icy|firm/.test(input)) add("avoid-firm");
    if (/avoid.*steep|not.*steep|don.t.*steep|no steep/.test(input))
      add("gentle", "steep");
    if (/groom/.test(input)) add("groomed");
    if (/visibility|fog/.test(input)) add("avoid-visibility");
    if (/where|mountain|today|best options/.test(input)) recognized = true;
    if (!recognized)
      return "I can apply easy/relaxed, longer/shorter, groomed, progression, and avoid-firm or low-visibility preferences. Try one of those.";
    // Natural-language requests can never raise the terrain ceiling.
    saveProfile(profile);
    let ranked = rankTrails(allTrails, profile, state.activities, conditions);
    if (/\bblue\b/.test(input))
      ranked = ranked.filter((f) => f.trail.difficulty === "blue");
    if (/\bgreen\b/.test(input))
      ranked = ranked.filter((f) => f.trail.difficulty === "green");
    const top = ranked[0];
    return top
      ? `${top.trail.name} is your best fit for that request (${top.score}% match). Preferences applied; your ${profile.ceiling} ceiling is unchanged. ${top.reasons.find((r) => r.startsWith("A longer")) ?? top.reasons[0]}`
      : `No matching runs within your ${profile.ceiling} ceiling. Change your terrain limit explicitly in Profile if you want to explore other ratings.`;
  };
  if (!state.onboarded)
    return (
      <Onboarding
        onDone={(profile, demo) => {
          setState({
            version: 2,
            onboarded: true,
            profile,
            activities: demo ? seedActivities() : [],
          });
        }}
      />
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="SlopeSense home"
        >
          <Icon name="mountain" size={31} />
          <span>
            SlopeSense<span className="brand-dot">.</span>
          </span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
            >
              <Icon name={n.icon} size={17} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <span className="demo-badge">
            <span className="status-dot" />
            WINTER REPLAY
          </span>
          <button
            className="avatar"
            aria-label="Open profile"
            onClick={() => navigate("profile")}
          >
            {state.profile.name.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>
      <div className="demo-ribbon">
        <span>DEMO · JAN 17, 2026</span>
        <span>Historical winter scenario · simulated weather & activity</span>
        <span className="offline-indicator">
          <span className="status-dot" />
          {online ? "Offline-ready data" : "Offline mode"}
        </span>
      </div>
      {warning && (
        <div className="storage-warning" role="status">
          <Icon name="info" size={16} />
          {warning}
          <button
            className="icon-button"
            aria-label="Dismiss storage notice"
            onClick={() => setWarning(null)}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <main className={`main-content ${page === "home" ? "home-content" : ""}`}>
        {replay ? (
          <Replay
            key={replay.key}
            trail={replay.trail}
            auto={replay.auto}
            profile={state.profile}
            activities={state.activities}
            fits={fits}
            onSave={(a) =>
              setState((s) =>
                s.activities.some((x) => x.id === a.id)
                  ? s
                  : { ...s, activities: [...s.activities, a].slice(-100) },
              )
            }
            onExit={() => setReplay(null)}
            onNext={openTrail}
          />
        ) : (
          <>
            {page === "home" && (
              <Home
                profile={state.profile}
                activities={state.activities}
                fits={fits}
                openMountain={openMountain}
                openTrail={openTrail}
                openActivity={openActivity}
                onAsk={ask}
                onNavigate={navigate}
              />
            )}
            {page === "explore" && (
              <Mountain
                resortId={resortId}
                selected={selected}
                fits={fits}
                profile={state.profile}
                onResort={openMountain}
                onSelect={setSelected}
                onReplay={(trail, auto) => {
                  setReplay({ trail, auto, key: Date.now() });
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
              />
            )}
            {page === "activity" && (
              <ActivityPage
                activities={state.activities}
                selected={activity}
                onSelect={setActivity}
                onExplore={() => navigate("explore")}
              />
            )}
            {page === "progress" && (
              <Progress
                activities={state.activities}
                profile={state.profile}
                onActivity={openActivity}
              />
            )}
            {page === "profile" && (
              <Profile
                profile={state.profile}
                count={state.activities.length}
                onSave={saveProfile}
                onReset={() => {
                  setState({
                    ...initialState(),
                    onboarded: true,
                    profile: demoProfile,
                  });
                  navigate("home");
                }}
              />
            )}
          </>
        )}
        <footer className="app-footer">
          <span className="footer-brand">
            <Icon name="mountain" size={18} />
            Made for your next mountain moment.
          </span>
          <span>North Shore, British Columbia · OSM data · Local demo</span>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            onClick={() => navigate(n.id)}
          >
            <Icon name={n.icon} size={21} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
export default App;
