import { DEFAULT_BINDS, FIELD_H, FIELD_W, FIXED_DT, PLAYER_COLORS } from "./constants";
import { Input } from "./input";
import { Sim, wormTemplate, type Phase, type SimSettings, type Worm } from "./sim";
import {
  addBurst,
  clearArena,
  createRenderer,
  drawOverlay,
  fit,
  shakeOffset,
  strokeWorms,
  type Renderer,
} from "./render";
import { audio } from "./audio";
import type { P2PRoomHandle } from "@/lib/multiplayer/use-p2p-room";
import { asMsg, type FrameMsg, type NetPlayer } from "./net";

export type HudState = {
  phase: Phase | "lobby";
  round: number;
  target: number;
  paused: boolean;
  worms: { id: string; name: string; color: string; score: number; alive: boolean; kind: string }[];
  banner: string | null;
  countdown: number | null;
  host: boolean;
  hostId: string;
  connected: boolean;
  peers: number;
};

export type LocalSlot = {
  kind: "human" | "bot" | "off";
  name: string;
};

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
  }
}

function defaultHud(): HudState {
  return {
    phase: "lobby",
    round: 1,
    target: 10,
    paused: false,
    worms: [],
    banner: null,
    countdown: null,
    host: true,
    hostId: "",
    connected: true,
    peers: 0,
  };
}

export class LocalSession {
  sim: Sim | null = null;
  input = new Input();
  renderer: Renderer | null = null;
  acc = 0;
  hud: HudState = defaultHud();
  settings: SimSettings;
  slots: LocalSlot[];
  binds = DEFAULT_BINDS;
  disposed = false;
  onHud?: (h: HudState) => void;
  private hudDirty = false;

  constructor(slots: LocalSlot[], settings: SimSettings) {
    this.slots = slots;
    this.settings = settings;
  }

  mount(trail: HTMLCanvasElement, overlay: HTMLCanvasElement) {
    this.disposed = false;
    this.input.attach();
    this.renderer = createRenderer(trail, overlay);
    if (!this.sim) this.startMatch();
    else clearArena(this.renderer, this.sim.barriers);
    this.wireQa();
  }

  releasePlay() {
    this.input.detach();
    this.renderer = null;
  }

  dispose() {
    this.disposed = true;
    this.releasePlay();
    if (typeof window !== "undefined") delete window.__controlsTest;
  }

  private startMatch() {
    const worms = this.slots
      .map((s, i) =>
        s.kind === "off" ? null : wormTemplate(`local-${i}`, s.name, i, s.kind),
      )
      .filter((w): w is NonNullable<typeof w> => w !== null);
    const seed = (Math.random() * 1e9) | 0;
    this.sim = new Sim(this.settings, seed, worms);
    if (this.renderer) clearArena(this.renderer, this.sim.barriers);
    this.pushHud();
  }

  replay() {
    if (!this.sim) return;
    for (const w of this.sim.worms) w.score = 0;
    this.sim.round = 0;
    this.sim.resetRound((Math.random() * 1e9) | 0);
    if (this.renderer) clearArena(this.renderer, this.sim.barriers);
    this.pushHud();
  }

  update(dt: number) {
    if (!this.sim || this.disposed) return;
    this.input.poll();

    if (this.input.justPressed.has("Space")) {
      if (this.sim.phase === "matchend") this.replay();
      else this.sim.paused = !this.sim.paused;
      this.pushHud();
    }

    if (this.sim.paused) {
      this.render(0);
      return;
    }

    this.applyInputs();
    this.acc += dt;
    const cap = FIXED_DT * 8;
    if (this.acc > cap) this.acc = cap;
    while (this.acc >= FIXED_DT) {
      const prevRound = this.sim.round;
      const prevPhase = this.sim.phase;
      this.sim.step(FIXED_DT);
      this.handleEvents();
      if (this.sim && (this.sim.round !== prevRound || (prevPhase !== "countdown" && this.sim.phase === "countdown"))) {
        if (this.renderer) clearArena(this.renderer, this.sim.barriers);
      }
      this.acc -= FIXED_DT;
    }
    this.render(dt);
    if (this.hudDirty) {
      this.hudDirty = false;
      this.onHud?.(this.hud);
    }
  }

  private applyInputs() {
    if (!this.sim) return;
    let humanIndex = 0;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      if (slot.kind !== "human") continue;
      const bind = this.binds[i]!;
      const extras = {
        mouse: humanIndex === 0,
        pad: humanIndex === 0,
        wasd: humanIndex === 0,
        touch: humanIndex === 0,
      };
      const { left, right } = this.input.pair(bind.left, bind.right, extras);
      this.sim.setInput(`local-${i}`, left, right);
      humanIndex += 1;
    }
  }

  private handleEvents() {
    if (!this.sim) return;
    for (const e of this.sim.drain()) {
      if (e.type === "death") {
        if (this.renderer) addBurst(this.renderer, e.x, e.y, e.color);
        audio.death();
      } else if (e.type === "countdown") {
        audio.countdown(e.n);
      } else if (e.type === "go") {
        audio.go();
      } else if (e.type === "round-end") {
        audio.roundEnd();
      } else if (e.type === "match-end") {
        audio.win();
      }
      this.pushHud();
    }
  }

  private render(dt: number) {
    if (!this.sim || !this.renderer) return;
    if (this.sim.phase === "playing" || this.sim.phase === "countdown") {
      strokeWorms(this.renderer, this.sim.worms);
    }
    const cd =
      this.sim.phase === "countdown" ? Math.max(1, Math.ceil(3 - this.sim.phaseT)) : null;
    let banner: string | null = null;
    if (this.sim.paused) banner = "Paused";
    if (this.sim.phase === "roundend") {
      const live = this.sim.worms.find((w) => w.alive);
      banner = live ? `${live.name} takes the round` : "Draw";
    }
    if (this.sim.phase === "matchend") {
      const w = [...this.sim.worms].sort((a, b) => b.score - a.score)[0];
      banner = w ? `${w.name} wins the match` : "Match over";
    }
    drawOverlay(this.renderer, this.sim.worms, dt, cd === 3 && this.sim.phaseT < 0.05 ? 3 : cd, banner);
  }

  shake(): { x: number; y: number } {
    return this.renderer ? shakeOffset(this.renderer) : { x: 0, y: 0 };
  }

  private pushHud() {
    if (!this.sim) return;
    const cd = this.sim.phase === "countdown" ? Math.max(1, Math.ceil(3 - this.sim.phaseT)) : null;
    this.hud = {
      phase: this.sim.phase,
      round: this.sim.round,
      target: this.settings.targetScore,
      paused: this.sim.paused,
      countdown: cd,
      banner: null,
      host: true,
      hostId: "",
      connected: true,
      peers: 0,
      worms: this.sim.worms
        .filter((w) => w.kind !== "off")
        .map((w) => ({
          id: w.id,
          name: w.name,
          color: w.color,
          score: w.score,
          alive: w.alive,
          kind: w.kind,
        })),
    };
    this.hudDirty = true;
    this.onHud?.(this.hud);
  }

  private wireQa() {
    if (typeof window === "undefined") return;
    window.__controlsTest = {
      getYaw: () => this.sim?.worms.find((w) => w.kind === "human")?.yaw ?? 0,
      getSpeed: () => {
        const w = this.sim?.worms.find((x) => x.kind === "human");
        if (!w || !w.alive || this.sim?.phase !== "playing") return 0;
        return this.sim?.speed ?? 0;
      },
      setSteer: (v) => {
        this.input.injectedSteer = v;
      },
      setKeys: (codes) => {
        this.input.keys = new Set(codes);
      },
    };
  }
}

export class OnlineSession {
  p2p: P2PRoomHandle;
  selfId: string;
  name: string;
  input = new Input();
  renderer: Renderer | null = null;
  sim: Sim | null = null;
  acc = 0;
  hud: HudState = defaultHud();
  settings: SimSettings;
  players: NetPlayer[] = [];
  hostId = "";
  botCount = 0;
  disposed = false;
  onHud?: (h: HudState) => void;
  lastBarriersKey = "";
  roundPainted = -1;
  unsub?: () => void;
  sendAcc = 0;
  private hudDirty = false;
  bound = false;
  private greeted = new Set<string>();

  constructor(p2p: P2PRoomHandle, name: string, settings: SimSettings) {
    this.p2p = p2p;
    this.selfId = p2p.selfId;
    this.name = name;
    this.settings = settings;
    this.hostId = "";
    this.ensureSelf();
    this.hud = { ...defaultHud(), host: false, hostId: "", connected: false, worms: this.lobbyRoster() };
  }

  get isHost() {
    return this.selfId === this.hostId;
  }

  mount(trail: HTMLCanvasElement, overlay: HTMLCanvasElement) {
    this.disposed = false;
    this.input.attach();
    this.renderer = createRenderer(trail, overlay);
    if (this.sim) clearArena(this.renderer, this.sim.barriers);
    this.wireQa();
  }

  bind() {
    if (this.bound) return;
    this.bound = true;
    this.unsub = this.p2p.onMessage((from, data, channel) => this.handleMessage(from, data, channel));
    this.ensureSelf();
    this.electHost();
    this.handshakeReadyPeers();
    this.pushHud();
  }

  unbind() {
    this.unsub?.();
    this.unsub = undefined;
    this.bound = false;
  }

  releasePlay() {
    this.input.detach();
    this.renderer = null;
  }

  dispose() {
    this.disposed = true;
    this.releasePlay();
    this.unbind();
    if (typeof window !== "undefined") delete window.__controlsTest;
  }

  electHost() {
    const announced = this.p2p.hostId;
    if (announced) {
      this.hostId = announced;
      return;
    }
    // Do not claim host while other peers are visible — the server is
    // the authority, and a guest claiming here is what stole the room.
    if (this.p2p.peers.length > 0) return;
    if (this.p2p.joined) this.hostId = this.selfId;
  }

  private handshakeReadyPeers() {
    for (const peer of this.p2p.peers) {
      if (!peer.reliableReady || this.greeted.has(peer.id)) continue;
      this.greeted.add(peer.id);
      this.p2p.send({ t: "hello", name: this.name }, peer.id);
      if (this.isHost) {
        this.ensurePeerPlayer(peer.id, peer.name);
        this.broadcastLobby();
      }
    }
  }

  onPeersChanged() {
    const live = new Set(this.p2p.peers.map((p) => p.id));
    for (const id of [...this.greeted]) {
      if (!live.has(id)) this.greeted.delete(id);
    }
    this.electHost();
    this.ensureSelf();
    if (this.isHost) {
      live.add(this.selfId);
      this.players = this.players.filter((p) => p.kind === "bot" || live.has(p.id));
      this.ensureSelf();
      for (const peer of this.p2p.peers) {
        this.ensurePeerPlayer(peer.id, peer.name);
      }
      if (this.sim && this.sim.phase === "playing") {
        for (const w of this.sim.worms) {
          if (w.kind === "remote" && !live.has(w.id) && w.alive) {
            this.sim.setInput(w.id, false, false);
            w.alive = false;
          }
        }
      }
      this.handshakeReadyPeers();
      this.broadcastLobby();
    } else {
      this.handshakeReadyPeers();
    }
    this.pushHud();
  }

  private colorIndex(used: string[]) {
    return PLAYER_COLORS.findIndex((c) => !used.includes(c.fill));
  }

  private addPlayer(id: string, name: string, kind: NetPlayer["kind"] = "remote"): NetPlayer {
    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      if (name) existing.name = name;
      return existing;
    }
    const idx = Math.max(0, this.colorIndex(this.players.map((p) => p.color)));
    const c = PLAYER_COLORS[idx]!;
    const row: NetPlayer = {
      id,
      name: name || "Pilot",
      color: c.fill,
      dim: c.dim,
      kind,
      score: 0,
    };
    this.players.push(row);
    return row;
  }

  private ensurePeerPlayer(id: string, name: string) {
    this.addPlayer(id, name, "remote");
  }

  private ensureSelf() {
    this.addPlayer(this.selfId, this.name, "human");
  }

  syncLobby() {
    this.ensureSelf();
    if (this.isHost) this.broadcastLobby();
    this.pushHud();
  }

  setBots(n: number) {
    if (!this.isHost) return;
    this.botCount = Math.max(0, Math.min(5, n));
    this.players = this.players.filter((p) => p.kind !== "bot");
    for (let i = 0; i < this.botCount; i++) {
      const idx = Math.max(0, this.colorIndex(this.players.map((p) => p.color)));
      const c = PLAYER_COLORS[idx]!;
      this.players.push({
        id: `bot-${i}`,
        name: `${c.name} bot`,
        color: c.fill,
        dim: c.dim,
        kind: "bot",
        score: 0,
      });
    }
    this.broadcastLobby();
    this.pushHud();
  }

  setSettings(s: Partial<SimSettings>) {
    if (!this.isHost) return;
    this.settings = { ...this.settings, ...s };
    this.broadcastLobby();
    this.pushHud();
  }

  startMatch() {
    if (!this.isHost) return;
    const all = this.players;
    if (all.length < 2) return;
    const seed = (Math.random() * 1e9) | 0;
    for (const p of this.players) p.score = 0;
    this.p2p.send({ t: "start", settings: this.settings, seed, players: all });
    this.beginSim(seed, all);
  }

  replay() {
    if (!this.isHost) return;
    this.startMatch();
  }

  private beginSim(seed: number, players: NetPlayer[]) {
    const worms = players.map((p, i) =>
      wormTemplate(
        p.id,
        p.name,
        PLAYER_COLORS.findIndex((c) => c.fill === p.color) >= 0
          ? PLAYER_COLORS.findIndex((c) => c.fill === p.color)
          : i,
        p.id === this.selfId ? "human" : p.kind === "bot" ? "bot" : "remote",
        0,
      ),
    );
    this.sim = new Sim(this.settings, seed, worms);
    this.roundPainted = this.sim.round;
    if (this.renderer) clearArena(this.renderer, this.sim.barriers);
    this.pushHud();
  }

  private broadcastLobby() {
    this.p2p.send({
      t: "lobby",
      hostId: this.hostId,
      players: this.players,
      settings: this.settings,
    });
  }

  handleMessage(from: string, data: unknown, _channel: "state" | "reliable") {
    const msg = asMsg(data);
    if (!msg) return;
    if (msg.t === "hello") {
      if (!this.isHost) return;
      this.addPlayer(from, msg.name || "Pilot", "remote");
      this.broadcastLobby();
      this.pushHud();
    } else if (msg.t === "lobby") {
      if (this.p2p.hostId && msg.hostId && msg.hostId !== this.p2p.hostId) {
        if (this.isHost) this.broadcastLobby();
        return;
      }
      if (this.isHost && this.selfId === (this.p2p.hostId || this.selfId)) {
        // We are the real host — keep our roster, don't adopt a guest's.
        this.broadcastLobby();
        return;
      }
      this.hostId = msg.hostId || this.p2p.hostId || this.hostId;
      this.players = msg.players.map((p) =>
        p.id === this.selfId ? { ...p, name: this.name || p.name } : p,
      );
      this.ensureSelf();
      this.settings = msg.settings;
      this.pushHud();
    } else if (msg.t === "start") {
      this.settings = msg.settings;
      this.players = msg.players;
      this.beginSim(msg.seed, msg.players);
    } else if (msg.t === "pause") {
      if (this.sim) this.sim.paused = msg.on;
      this.pushHud();
    } else if (msg.t === "in") {
      if (this.isHost && this.sim) this.sim.setInput(from, msg.L === 1, msg.R === 1);
    } else if (msg.t === "f") {
      if (!this.isHost) this.applyFrame(msg);
    }
  }

  private applyFrame(msg: FrameMsg) {
    if (!this.renderer) return;
    const key = JSON.stringify(msg.barriers);
    if (key !== this.lastBarriersKey || msg.round !== this.roundPainted) {
      this.lastBarriersKey = key;
      this.roundPainted = msg.round;
      clearArena(this.renderer, msg.barriers);
    }
    const worms: Worm[] = msg.worms.map((w) => ({
      id: w.id,
      name: w.name,
      color: w.color,
      dim: w.dim,
      kind: w.kind,
      x: w.x,
      y: w.y,
      yaw: w.yaw,
      alive: w.a === 1,
      inHole: w.h === 1,
      holeIn: 0,
      left: false,
      right: false,
      score: w.sc,
      botHold: 0,
      botDir: 0,
    }));
    const prevAlive = new Set(
      [...this.renderer.last.entries()].filter(([, v]) => v.alive).map(([id]) => id),
    );
    strokeWorms(this.renderer, worms);
    for (const w of worms) {
      if (!w.alive && prevAlive.has(w.id)) {
        addBurst(this.renderer, w.x, w.y, w.color);
        audio.death();
      }
    }
    this.clientWorms = worms;
    this.clientPhase = msg.phase as Phase;
    this.clientPt = msg.pt;
    this.clientRound = msg.round;
    this.settings.targetScore = msg.target;
    this.pushHudClient(worms, msg);
  }

  clientWorms: Worm[] = [];
  clientPhase: Phase = "countdown";
  clientPt = 0;
  clientRound = 1;

  update(dt: number) {
    if (this.disposed) return;
    this.input.poll();
    this.electHost();

    const { left, right } = this.input.pair("ArrowLeft", "ArrowRight", {
      wasd: true,
      mouse: true,
      pad: true,
      touch: true,
    });

    if (this.input.justPressed.has("Space") && this.isHost && this.sim) {
      if (this.sim.phase === "matchend") this.replay();
      else {
        this.sim.paused = !this.sim.paused;
        this.p2p.send({ t: "pause", on: this.sim.paused });
      }
    }

    this.sendAcc += dt;
    if (this.sendAcc >= 1 / 30) {
      this.sendAcc = 0;
      this.p2p.broadcast({ t: "in", L: left ? 1 : 0, R: right ? 1 : 0 });
    }

    if (this.isHost && this.sim) {
      this.sim.setInput(this.selfId, left, right);
      if (!this.sim.paused) {
        this.acc += dt;
        const cap = FIXED_DT * 8;
        if (this.acc > cap) this.acc = cap;
        while (this.acc >= FIXED_DT) {
          const prevRound = this.sim.round;
          this.sim.step(FIXED_DT);
          this.handleEvents();
          if (this.sim.round !== prevRound && this.renderer) {
            clearArena(this.renderer, this.sim.barriers);
          }
          this.acc -= FIXED_DT;
        }
      }
      this.broadcastFrame();
      this.renderHost(dt);
    } else {
      this.renderClient(dt);
    }

    if (this.hudDirty) {
      this.hudDirty = false;
      this.onHud?.(this.hud);
    }
  }

  private handleEvents() {
    if (!this.sim) return;
    for (const e of this.sim.drain()) {
      if (e.type === "death") {
        if (this.renderer) addBurst(this.renderer, e.x, e.y, e.color);
        audio.death();
      } else if (e.type === "countdown") audio.countdown(e.n);
      else if (e.type === "go") audio.go();
      else if (e.type === "round-end") audio.roundEnd();
      else if (e.type === "match-end") audio.win();
      this.pushHud();
    }
  }

  private broadcastFrame() {
    if (!this.sim) return;
    const msg: FrameMsg = {
      t: "f",
      phase: this.sim.phase,
      pt: this.sim.phaseT,
      round: this.sim.round,
      target: this.settings.targetScore,
      tick: this.sim.tick,
      barriers: this.sim.barriers,
      worms: this.sim.worms.map((w) => ({
        id: w.id,
        x: w.x,
        y: w.y,
        yaw: w.yaw,
        a: w.alive ? 1 : 0,
        h: w.inHole ? 1 : 0,
        sc: w.score,
        color: w.color,
        dim: w.dim,
        name: w.name,
        kind: w.kind,
      })),
    };
    this.p2p.broadcast(msg);
  }

  private renderHost(dt: number) {
    if (!this.sim || !this.renderer) return;
    if (this.sim.phase === "playing" || this.sim.phase === "countdown") {
      strokeWorms(this.renderer, this.sim.worms);
    }
    const cd =
      this.sim.phase === "countdown" ? Math.max(1, Math.ceil(3 - this.sim.phaseT)) : null;
    let banner: string | null = null;
    if (this.sim.paused) banner = "Paused";
    if (this.sim.phase === "roundend") {
      const live = this.sim.worms.find((w) => w.alive);
      banner = live ? `${live.name} takes the round` : "Draw";
    }
    if (this.sim.phase === "matchend") {
      const w = [...this.sim.worms].sort((a, b) => b.score - a.score)[0];
      banner = w ? `${w.name} wins the match` : "Match over";
    }
    drawOverlay(this.renderer, this.sim.worms, dt, cd, banner);
  }

  private renderClient(dt: number) {
    if (!this.renderer) return;
    const worms = this.clientWorms;
    const cd =
      this.clientPhase === "countdown" ? Math.max(1, Math.ceil(3 - this.clientPt)) : null;
    let banner: string | null = null;
    if (this.clientPhase === "roundend") {
      const live = worms.find((w) => w.alive);
      banner = live ? `${live.name} takes the round` : "Draw";
    }
    if (this.clientPhase === "matchend") {
      const w = [...worms].sort((a, b) => b.score - a.score)[0];
      banner = w ? `${w.name} wins the match` : "Match over";
    }
    drawOverlay(this.renderer, worms, dt, cd, banner);
  }

  shake(): { x: number; y: number } {
    return this.renderer ? shakeOffset(this.renderer) : { x: 0, y: 0 };
  }

  private pushHud() {
    const sim = this.sim;
    this.ensureSelf();
    const roster: { id: string; name: string; color: string; score: number; alive: boolean; kind: string }[] =
      sim
        ? sim.worms.map((w) => ({
            id: w.id,
            name: w.name,
            color: w.color,
            score: w.score,
            alive: w.alive,
            kind: w.kind,
          }))
        : this.lobbyRoster();
    this.hud = {
      phase: sim ? sim.phase : "lobby",
      round: sim?.round ?? 1,
      target: this.settings.targetScore,
      paused: sim?.paused ?? false,
      countdown: sim?.phase === "countdown" ? Math.max(1, Math.ceil(3 - sim.phaseT)) : null,
      banner: null,
      host: this.isHost,
      hostId: this.hostId,
      connected: this.p2p.joined,
      peers: this.p2p.peers.length,
      worms: roster,
    };
    this.hudDirty = true;
    this.onHud?.(this.hud);
  }

  private lobbyRoster() {
    const byId = new Map(this.players.map((p) => [p.id, p]));
    const extra: NetPlayer[] = [];
    for (const peer of this.p2p.peers) {
      if (byId.has(peer.id)) continue;
      const used = [...byId.values(), ...extra].map((p) => p.color);
      const idx = Math.max(0, this.colorIndex(used));
      const c = PLAYER_COLORS[idx]!;
      extra.push({
        id: peer.id,
        name: peer.name || "Pilot",
        color: c.fill,
        dim: c.dim,
        kind: "remote",
        score: 0,
      });
    }
    return [...byId.values(), ...extra].map((w) => ({
      id: w.id,
      name: w.name,
      color: w.color,
      score: w.score,
      alive: true,
      kind: w.kind,
    }));
  }

  private pushHudClient(worms: Worm[], msg: FrameMsg) {
    this.hud = {
      phase: msg.phase as Phase,
      round: msg.round,
      target: msg.target,
      paused: false,
      countdown: msg.phase === "countdown" ? Math.max(1, Math.ceil(3 - msg.pt)) : null,
      banner: null,
      host: false,
      hostId: this.hostId,
      connected: this.p2p.joined,
      peers: this.p2p.peers.length,
      worms: worms.map((w) => ({
        id: w.id,
        name: w.name,
        color: w.color,
        score: w.score,
        alive: w.alive,
        kind: w.kind,
      })),
    };
    this.hudDirty = true;
    this.onHud?.(this.hud);
  }

  private wireQa() {
    if (typeof window === "undefined") return;
    window.__controlsTest = {
      getYaw: () => {
        const id = this.selfId;
        if (this.sim) return this.sim.worms.find((w) => w.id === id)?.yaw ?? 0;
        return this.clientWorms.find((w) => w.id === id)?.yaw ?? 0;
      },
      getSpeed: () => {
        const w = this.sim?.worms.find((x) => x.id === this.selfId);
        if (!w || !w.alive || this.sim?.phase !== "playing") return 0;
        return this.sim.speed;
      },
      setSteer: (v) => {
        this.input.injectedSteer = v;
      },
      setKeys: (codes) => {
        this.input.keys = new Set(codes);
      },
    };
  }
}

export { FIELD_W, FIELD_H, fit as fitCanvases };
