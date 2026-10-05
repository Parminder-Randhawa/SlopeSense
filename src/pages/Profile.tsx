import { useState } from "react";
import type { Profile as RiderProfile } from "../types/rider";
import { ProfileFields } from "../components/ProfileForm";
import { PageHeading } from "../components/Shared";
import { Icon } from "../components/Icon";
import { mountainInfo } from "../data/mountains";
export function Profile({
  profile,
  count,
  onSave,
  demo,
  onDemo,
  locked,
  onHistory,
  onExport,
}: {
  profile: RiderProfile;
  count: number;
  onSave: (p: RiderProfile) => void;
  demo: boolean;
  onDemo: (v: boolean) => void;
  locked: boolean;
  onHistory: () => void;
  onExport: () => void;
}) {
  const [draft, setDraft] = useState(profile),
    [saved, setSaved] = useState(false);
  return (
    <div className="profile-page page-enter">
      <PageHeading eyebrow="YOUR LOCAL PROFILE" title="Make it your ride." />
      <div className="profile-layout">
        <section className="panel">
          <div className="profile-identity">
            <span className="avatar large">
              {draft.name[0]?.toUpperCase() || "R"}
            </span>
            <div>
              <h2>{draft.name || "Rider"}</h2>
              <p>
                {count} {demo ? "demo" : "saved"} activities · this device
              </p>
            </div>
          </div>
          <div className="profile-links">
            <button className="secondary" onClick={onHistory}>
              Activities
              <Icon name="activity" size={17} />
            </button>
            <button className="secondary" onClick={onExport}>
              Export my data
              <Icon name="arrow" size={17} />
            </button>
          </div>
          <ProfileFields
            profile={draft}
            onChange={(p) => {
              setDraft(p);
              setSaved(false);
            }}
          />
          <button
            className="primary"
            onClick={() => {
              onSave({ ...draft, name: draft.name.trim() || "Rider" });
              setSaved(true);
            }}
          >
            {saved ? "Preferences saved" : "Save preferences"}
            <Icon name={saved ? "check" : "arrow"} />
          </button>
        </section>
        <aside>
          <section className="panel settings-panel">
            <p className="eyebrow">SETTINGS</p>
            <h2>Hackathon demo</h2>
            <div className="setting-row">
              <div>
                <strong>Demo mode</strong>
                <p>Alex’s complete rider profile & sample rides.</p>
              </div>
              <button
                role="switch"
                aria-checked={demo}
                aria-label="Demo mode"
                disabled={locked}
                className={`toggle-switch ${demo ? "on" : ""}`}
                onClick={() => onDemo(!demo)}
              >
                <i />
              </button>
            </div>
            <p className="fine-print">
              {locked
                ? "Finish or discard your current draft before switching modes."
                : "Includes six completed rides, feedback, progress stats and playable replays. Demo data stays separate from your real profile."}
            </p>
            <span className={`mode-status ${demo ? "demo" : ""}`}>
              <span className="status-dot" />
              {demo ? "Demo mode active" : "Live GPS & weather"}
            </span>
          </section>
          <section className="panel data-transparency">
            <h2>On this device</h2>
            <p>
              Your profile, GPS drafts and saved rides are stored in this
              browser. Export a backup before clearing browser data. No account
              is required.
            </p>
            <h3>What is live</h3>
            <p>
              Device location while recording, and Open-Meteo weather estimates
              refreshed every 10 minutes. The illustrated home scene is
              decorative; use the run map for geographic context.
            </p>
            <h3>What is mapped</h3>
            <p>
              37 OSM runs across Cypress, Grouse and Seymour. This selection is
              not a complete resort trail map. Resort operating status and daily
              grooming remain unverified.
            </p>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Weather: Open-Meteo ↗
            </a>
            <br />
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              Trails: OpenStreetMap · ODbL ↗
            </a>
          </section>
          <details className="panel photo-credits">
            <summary>
              Illustration & map sources <Icon name="plus" size={16} />
            </summary>
            <p>
              The home illustration is inspired by actual resort terrain
              references. It is decorative, not a navigation map.
            </p>
            <p>
              Run maps use OpenStreetMap coordinates and cartographic context.
            </p>
            <a
              href="https://www.openstreetmap.org/fixthemap"
              target="_blank"
              rel="noreferrer"
            >
              Report a map issue ↗
            </a>
          </details>
        </aside>
      </div>
    </div>
  );
}
