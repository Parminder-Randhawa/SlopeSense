import { useState } from "react";
import type { Profile as RiderProfile } from "../types/rider";
import { ProfileFields } from "../components/ProfileForm";
import { PageHeading, Notice } from "../components/Shared";
import { Icon } from "../components/Icon";
export function Profile({
  profile,
  count,
  onSave,
  onReset,
}: {
  profile: RiderProfile;
  count: number;
  onSave: (p: RiderProfile) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(profile),
    [saved, setSaved] = useState(false),
    [confirm, setConfirm] = useState(false);
  return (
    <div className="profile-page page-enter">
      <PageHeading
        eyebrow="MAKE THE MOUNTAIN YOURS"
        title="Your ride. Your rules."
        subtitle="A few preferences. A more personal day on the snow."
      />
      <div className="profile-layout">
        <section className="panel">
          <div className="profile-identity">
            <span className="avatar large">
              {draft.name.slice(0, 1).toUpperCase() || "R"}
            </span>
            <div>
              <h2>{draft.name || "Rider"}</h2>
              <p>
                {draft.experience}{" "}
                {draft.sport === "ski" ? "skier" : "snowboarder"} · {count} demo
                runs
              </p>
            </div>
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
            {saved ? (
              <>
                <Icon name="check" />
                Preferences saved
              </>
            ) : (
              <>
                Save my preferences
                <Icon name="arrow" />
              </>
            )}
          </button>
          {saved && (
            <p className="saved-note" role="status">
              Your mountain and trail matches have been recalculated.
            </p>
          )}
        </section>
        <aside>
          <div className="panel data-transparency">
            <p className="eyebrow">AN HONEST LOOK AT YOUR DATA</p>
            <h2>
              Real trails.
              <br />
              Transparent insights.
            </h2>
            <dl>
              <dt>
                <span className="source-dot real" />
                Mapped data
              </dt>
              <dd>
                37 real named trails and geographic coordinates from
                OpenStreetMap. Community-mapped difficulty; official ratings are
                not independently verified.
              </dd>
              <dt>
                <span className="source-dot simulated" />
                Simulated data
              </dt>
              <dd>
                Jan 17, 2026 winter weather, every replay's movement, elevation
                and pitch, and Alex's seeded activity history.
              </dd>
              <dt>
                <span className="source-dot calculated" />
                Calculated analytics
              </dt>
              <dd>
                Distance, duration, vertical, stops, pace variation, dimension
                evidence and deterministic match scores.
              </dd>
              <dt>
                <span className="source-dot reported" />
                Rider reports
              </dt>
              <dd>
                Your terrain ceiling, preferences, run feedback and optional
                surface report.
              </dd>
              <dt>Unknown</dt>
              <dd>
                Daily openings, surveyed elevation, exact terrain
                characteristics and most grooming information. Weather is not
                proof of a trail's surface.
              </dd>
            </dl>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap contributors · ODbL 1.0 ↗
            </a>
          </div>
          <div className="panel reset-panel">
            <h3>A fresh day on the mountain</h3>
            <p>
              Restore Alex, the Blue terrain ceiling, and the six original
              replay activities on this device.
            </p>
            {confirm ? (
              <div>
                <p>
                  This replaces your saved local profile and replay history.
                </p>
                <div className="choice-row">
                  <button
                    className="secondary"
                    onClick={() => setConfirm(false)}
                  >
                    Keep my data
                  </button>
                  <button className="danger-button" onClick={onReset}>
                    Reset demo
                  </button>
                </div>
              </div>
            ) : (
              <button className="secondary" onClick={() => setConfirm(true)}>
                <Icon name="reset" size={17} />
                Reset demo account
              </button>
            )}
          </div>
        </aside>
      </div>
      <Notice>
        Your data stays in this browser. SlopeSense is a demo recommendation
        tool, not a live resort operations, navigation or avalanche-safety
        service.
      </Notice>
    </div>
  );
}
