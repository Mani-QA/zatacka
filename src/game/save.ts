export type SaveV1 = {
  version: 1;
  name: string;
  volume: number;
  muted: boolean;
  shake: boolean;
  speed: number;
  holes: boolean;
  barriers: number;
  targetScore: number;
};

const KEY = "zatacka-save-v1";

export const DEFAULT_SAVE: SaveV1 = {
  version: 1,
  name: "Pilot",
  volume: 0.7,
  muted: false,
  shake: true,
  speed: 1,
  holes: true,
  barriers: 0,
  targetScore: 10,
};

export function loadSave(): SaveV1 {
  if (typeof window === "undefined") return { ...DEFAULT_SAVE };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveV1>;
    return { ...DEFAULT_SAVE, ...parsed, version: 1 };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(patch: Partial<SaveV1>) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadSave(), ...patch, version: 1 as const };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}
