import type { CSSProperties } from "react";

export function Icon({ name, size = 22, className = "", style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const paths: Record<string, React.ReactNode> = {
    anchor: <><circle cx="12" cy="4" r="2" /><path d="M12 6v14M8 10h8M4 14c0 8 16 8 16 0M4 14l-2 2m18-2 2 2" /></>,
    fish: <><path d="M20 12s-4-6-9-6-7 6-7 6 2 6 7 6 9-6 9-6ZM4 12 1 8v8z" /><circle cx="15" cy="11" r=".6" fill="currentColor" /><path d="m10 6 2-3 2 4M9 18l2 3 3-4" /></>,
    book: <><path d="M12 5c-3-3-7-3-10-1v15c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1Zm0 0v15M5 8h3m-3 4h3m8-4h3m-3 4h3" /></>,
    coin: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="6" opacity=".5" /><path d="m13.5 8-4 4h5l-4 4" /></>,
    net: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 3v18M3 12h18M6 6l12 12M6 18 18 6" /></>,
    bolt: <path d="m14 2-9 12h7l-2 8 9-12h-7z" />,
    shield: <><path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6z" /><path d="m8 12 3 3 5-6" /></>,
    sonar: <><circle cx="5" cy="19" r="1" /><path d="M5 13a6 6 0 0 1 6 6M5 8a11 11 0 0 1 11 11M5 3a16 16 0 0 1 16 16" /></>,
    map: <><path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3zM8 2v17m8-14v17" /></>,
    pin: <><path d="M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13Z" /><circle cx="12" cy="9" r="3" /></>,
    shop: <><path d="M3 10v11h18V10M2 10l2-7h16l2 7M2 10c0 3 5 3 5 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 5 3 5 0M9 21v-7h6v7" /></>,
    wrench: <><path d="M21 3a6 6 0 0 1-8 8l-8 9a2 2 0 0 1-3-3l9-8a6 6 0 0 1 8-8l-4 4 4 4z" /></>,
    scroll: <><path d="M5 3h13a3 3 0 0 1 3 3v2h-4M5 3a3 3 0 0 0-3 3v2h3V3Zm0 5v10a3 3 0 0 0 6 0v-1h10v1a3 3 0 0 1-3 3H8M9 8h5m-5 4h5" /></>,
    chest: <><path d="M3 10V8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v2M2 10h20v10H2zM7 10V4m10 6V4" /><rect x="10" y="9" width="4" height="5" rx="1" /></>,
    arrow: <path d="M3 12h17m-7-6 7 6-7 6" />,
    back: <path d="M21 12H4m7-6-7 6 7 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m4 12 5 5L20 6" />,
    star: <path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z" />,
    bait: <><path d="M18 3v11a6 6 0 0 1-12 0v-3l4 3M5 5h6M3 3h2" /><circle cx="18" cy="3" r="1" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></>,
    compass: <><circle cx="12" cy="12" r="10" /><path d="m16 8-3 5-5 3 3-5z" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    leaf: <><path d="M20 3C8 2 3 8 5 15s15 5 15-12ZM5 19 16 8" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0, ...style }}>{paths[name] || paths.anchor}</svg>;
}
