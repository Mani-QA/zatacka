import type { PlayerKind } from "./constants";
import type { SimSettings } from "./sim";

export type NetPlayer = {
  id: string;
  name: string;
  color: string;
  dim: string;
  kind: PlayerKind;
  score: number;
};

export type HelloMsg = { t: "hello"; name: string };
export type LobbyMsg = {
  t: "lobby";
  hostId: string;
  players: NetPlayer[];
  settings: SimSettings;
  seed?: number;
};
export type StartMsg = { t: "start"; settings: SimSettings; seed: number; players: NetPlayer[] };
export type PauseMsg = { t: "pause"; on: boolean };
export type AddBotMsg = { t: "bot"; n: number };
export type InputMsg = { t: "in"; L: number; R: number };
export type FrameWorm = {
  id: string;
  x: number;
  y: number;
  yaw: number;
  a: number;
  h: number;
  sc: number;
  color: string;
  dim: string;
  name: string;
  kind: PlayerKind;
};
export type FrameMsg = {
  t: "f";
  phase: string;
  pt: number;
  round: number;
  target: number;
  worms: FrameWorm[];
  barriers: { x: number; y: number; w: number; h: number }[];
  tick: number;
};

export type NetMsg =
  | HelloMsg
  | LobbyMsg
  | StartMsg
  | PauseMsg
  | AddBotMsg
  | InputMsg
  | FrameMsg;

export function asMsg(data: unknown): NetMsg | null {
  if (!data || typeof data !== "object") return null;
  const t = (data as { t?: unknown }).t;
  if (typeof t !== "string") return null;
  return data as NetMsg;
}
