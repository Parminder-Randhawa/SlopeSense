import type { Resort, ResortId } from "../types/resort";

type ResortSelectorProps = {
  resorts: Resort[];
  activeResortId: ResortId;
  onSelect: (resortId: ResortId) => void;
};

export function ResortSelector({
  resorts,
  activeResortId,
  onSelect,
}: ResortSelectorProps) {
  return (
    <nav className="resort-selector" aria-label="Choose a ski resort">
      {resorts.map((resort) => {
        const isActive = resort.id === activeResortId;
        return (
          <button
            className="resort-selector__button"
            data-active={isActive}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(resort.id)}
            key={resort.id}
          >
            <span className="resort-selector__dot" aria-hidden="true" />
            {resort.shortName}
          </button>
        );
      })}
    </nav>
  );
}
