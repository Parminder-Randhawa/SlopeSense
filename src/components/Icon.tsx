import type { CSSProperties, ReactNode } from "react";
const paths: Record<string, ReactNode> = {
  record: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></>,
  mountain: (
    <>
      <path d="m2 20 7-14 5 8 3-5 5 11H2Z" />
      <path d="m7 10 2 3 2-3m4 3 2 2 2-2" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3V10Z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2 6-6 2 2-6 6-2Z" />
    </>
  ),
  activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  progress: (
    <>
      <path d="M4 20V10m8 10V4m8 16v-7" />
      <path d="m3 5 6-3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="m14 5-7 7 7 7" />,
  snow: (
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3l3 3 3-3M9 21l3-3 3 3M3 10l4-1V5m14 9-4 1v4M3 14l4 1v4m14-9-4-1V5" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  cloud: <path d="M6 18h12a4 4 0 0 0 0-8 6 6 0 0 0-11-3 5.5 5.5 0 0 0-1 11Z" />,
  wind: <path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7" />,
  star: (
    <path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9L12 3Z" />
  ),
  play: <path d="m8 4 12 8-12 8V4Z" />,
  pause: <path d="M8 5v14m8-14v14" />,
  reset: <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m4 12 5 5L20 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  location: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.1" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3m0 16v3M1 12h3m16 0h3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  down: <path d="M12 3v18m-6-6 6 6 6-6" />,
  layers: <path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" />,
};
export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name] ?? paths.mountain}
    </svg>
  );
}
