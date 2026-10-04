import { useState } from "react";
import type { Ceiling, Goal, Preference, Profile } from "../types/rider";
import { demoProfile } from "../data/demo";
import { Icon } from "./Icon";
import { DifficultyPill } from "./Shared";
export const preferenceLabels: Record<Preference, string> = {
  groomed: "Groomed",
  long: "Longer runs",
  short: "Shorter runs",
  gentle: "Gentle terrain",
  steep: "Steeper terrain",
  trees: "Trees",
  open: "Open terrain",
  park: "Terrain parks",
  "avoid-firm": "Avoid firm snow",
  "avoid-visibility": "Avoid low visibility",
};
export const goalLabels: Record<Goal, string> = {
  relax: "Take it easy",
  explore: "Explore more",
  improve: "Find my next step",
  challenge: "Challenge myself",
};
export function ProfileFields({
  profile,
  onChange,
  section = "all",
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  section?: "all" | "rider" | "terrain" | "goal";
}) {
  const update = (p: Partial<Profile>) => onChange({ ...profile, ...p });
  return (
    <div className="profile-fields">
      {(section === "all" || section === "rider") && (
        <>
          <label className="field-label" htmlFor="rider-name">
            Your name
          </label>
          <input
            id="rider-name"
            maxLength={30}
            value={profile.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <p className="field-label">I ride</p>
          <div className="choice-row">
            {(["snowboard", "ski"] as const).map((s) => (
              <button
                key={s}
                className={`choice ${profile.sport === s ? "selected" : ""}`}
                aria-pressed={profile.sport === s}
                onClick={() => update({ sport: s })}
              >
                <Icon name="mountain" />
                {s === "ski" ? "Skis" : "Snowboard"}
              </button>
            ))}
          </div>
          <p className="field-label">Experience</p>
          <div className="chips">
            {(["beginner", "intermediate", "advanced", "expert"] as const).map(
              (s) => (
                <button
                  key={s}
                  className={`chip ${profile.experience === s ? "selected" : ""}`}
                  aria-pressed={profile.experience === s}
                  onClick={() => update({ experience: s })}
                >
                  {s}
                </button>
              ),
            )}
          </div>
        </>
      )}
      {(section === "all" || section === "terrain") && (
        <>
          <p className="field-label">My maximum terrain</p>
          <p className="field-help">
            Your limit, always. Recommendations never go above it.
          </p>
          <div className="ceiling-options">
            {(["green", "blue", "black", "double-black"] as Ceiling[]).map(
              (d) => (
                <button
                  key={d}
                  className={`choice ${profile.ceiling === d ? "selected" : ""}`}
                  aria-pressed={profile.ceiling === d}
                  onClick={() => update({ ceiling: d })}
                >
                  <DifficultyPill difficulty={d} />
                  {profile.ceiling === d && <Icon name="check" size={16} />}
                </button>
              ),
            )}
          </div>
          <p className="field-label">
            What makes a good run? <small>Optional</small>
          </p>
          <div className="chips">
            {Object.entries(preferenceLabels).map(([key, label]) => (
              <button
                key={key}
                className={`chip ${profile.preferences.includes(key as Preference) ? "selected" : ""}`}
                aria-pressed={profile.preferences.includes(key as Preference)}
                onClick={() => {
                  const p = key as Preference;
                  let next = profile.preferences.includes(p)
                    ? profile.preferences.filter((x) => x !== p)
                    : [...profile.preferences, p];
                  const opposite: Partial<Record<Preference, Preference>> = {
                    long: "short",
                    short: "long",
                    gentle: "steep",
                    steep: "gentle",
                  };
                  if (next.includes(p) && opposite[p])
                    next = next.filter((x) => x !== opposite[p]);
                  update({ preferences: next });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {(section === "all" || section === "goal") && (
        <>
          <p className="field-label">Today's intention</p>
          <div className="goals">
            {Object.entries(goalLabels).map(([goal, label]) => (
              <button
                key={goal}
                className={`choice ${profile.goal === goal ? "selected" : ""}`}
                aria-pressed={profile.goal === goal}
                onClick={() => update({ goal: goal as Goal })}
              >
                <Icon
                  name={
                    goal === "improve"
                      ? "progress"
                      : goal === "explore"
                        ? "compass"
                        : goal === "relax"
                          ? "sun"
                          : "target"
                  }
                />
                {label}
                {profile.goal === goal && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
export function Onboarding({
  onDone,
}: {
  onDone: (p: Profile, demo: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({
    ...demoProfile,
    name: "",
    preferences: [],
  });
  return (
    <div className="onboarding">
      <div className="onboarding-photo" />
      <div className="onboarding-panel">
        <a className="brand">
          <Icon name="mountain" size={32} />
          <span>
            SlopeSense<span className="brand-dot">.</span>
          </span>
        </a>
        {step === 0 ? (
          <>
            <p className="eyebrow">LESS GUESSING. MORE MOUNTAIN.</p>
            <h1>
              A better
              <br />
              next run.
            </h1>
            <p className="intro-copy">
              Find your mountain. Understand your riding.
              <br />
              Discover what comes next.
            </p>
            <div className="onboarding-points">
              <span>
                <Icon name="compass" /> Three North Shore mountains
              </span>
              <span>
                <Icon name="activity" /> Insights that learn from every run
              </span>
              <span>
                <Icon name="target" /> Your terrain limit, always respected
              </span>
            </div>
            <button
              className="primary"
              onClick={() => onDone(demoProfile, true)}
            >
              Explore Alex's demo <Icon name="arrow" />
            </button>
            <p className="demo-profile-note">
              Intermediate snowboarder · maximum Blue terrain
              <br />
              Includes six simulated activities
            </p>
            <button className="text-button" onClick={() => setStep(1)}>
              Set up my own rider <Icon name="chevron" size={16} />
            </button>
            <p className="fine-print">
              Demo Replay · Historical winter scenario
              <br />
              Jan 17, 2026 · Weather and telemetry are simulated
            </p>
          </>
        ) : (
          <>
            <div className="onboarding-step">
              <button
                className="icon-button"
                aria-label="Previous step"
                onClick={() => setStep(step - 1)}
              >
                <Icon name="back" />
              </button>
              <span>YOUR RIDER · {step} OF 3</span>
            </div>
            <h2>
              {step === 1
                ? "How do you ride?"
                : step === 2
                  ? "Stay in your element."
                  : "Make today yours."}
            </h2>
            <ProfileFields
              profile={profile}
              onChange={setProfile}
              section={step === 1 ? "rider" : step === 2 ? "terrain" : "goal"}
            />
            <button
              className="primary"
              onClick={() =>
                step < 3
                  ? setStep(step + 1)
                  : onDone(
                      { ...profile, name: profile.name.trim() || "Rider" },
                      false,
                    )
              }
            >
              {step === 3 ? "Find my next run" : "Continue"}
              <Icon name="arrow" />
            </button>
            <p className="fine-print">
              Your personal rider starts with no activity evidence. Replay a run
              to begin learning.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
