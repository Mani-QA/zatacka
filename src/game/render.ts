import { BORDER, FIELD_H, FIELD_W, RADIUS } from "./constants";
import type { Barrier, Worm } from "./sim";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};

export type Renderer = {
  trail: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
  tctx: CanvasRenderingContext2D;
  octx: CanvasRenderingContext2D;
  particles: Particle[];
  trauma: number;
  flash: number;
  reduced: boolean;
  last: Map<string, { x: number; y: number; hole: boolean; alive: boolean }>;
};

export function createRenderer(trail: HTMLCanvasElement, overlay: HTMLCanvasElement): Renderer {
  const tctx = trail.getContext("2d")!;
  const octx = overlay.getContext("2d")!;
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  fit(trail, overlay);
  return {
    trail,
    overlay,
    tctx,
    octx,
    particles: [],
    trauma: 0,
    flash: 0,
    reduced,
    last: new Map(),
  };
}

export function fit(trail: HTMLCanvasElement, overlay: HTMLCanvasElement) {
  const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  for (const c of [trail, overlay]) {
    c.width = Math.round(FIELD_W * dpr);
    c.height = Math.round(FIELD_H * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

export function clearArena(r: Renderer, barriers: Barrier[]) {
  const { tctx } = r;
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.clearRect(0, 0, r.trail.width, r.trail.height);
  const dpr = r.trail.width / FIELD_W;
  tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tctx.fillStyle = "#050506";
  tctx.fillRect(0, 0, FIELD_W, FIELD_H);

  tctx.strokeStyle = "rgba(200,204,212,0.22)";
  tctx.lineWidth = 2;
  tctx.strokeRect(BORDER - 1, BORDER - 1, FIELD_W - BORDER * 2 + 2, FIELD_H - BORDER * 2 + 2);

  tctx.fillStyle = "rgba(200,204,212,0.16)";
  for (const b of barriers) {
    tctx.fillRect(b.x, b.y, b.w, b.h);
  }
  r.last.clear();
}

export function addBurst(r: Renderer, x: number, y: number, color: string) {
  const n = r.reduced ? 8 : 28;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 180;
    r.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      color,
      size: 1.4 + Math.random() * 2.2,
    });
  }
  if (!r.reduced) r.trauma = Math.min(1, r.trauma + 0.55);
  r.flash = 1;
}

export function strokeWorms(r: Renderer, worms: Worm[]) {
  const { tctx } = r;
  tctx.lineCap = "round";
  tctx.lineJoin = "round";
  tctx.lineWidth = RADIUS * 2;
  for (const w of worms) {
    const prev = r.last.get(w.id);
    if (w.alive && prev && !prev.hole && !w.inHole) {
      tctx.strokeStyle = w.color;
      tctx.beginPath();
      tctx.moveTo(prev.x, prev.y);
      tctx.lineTo(w.x, w.y);
      tctx.stroke();
    } else if (w.alive && !w.inHole && !prev) {
      tctx.fillStyle = w.color;
      tctx.beginPath();
      tctx.arc(w.x, w.y, RADIUS, 0, Math.PI * 2);
      tctx.fill();
    }
    r.last.set(w.id, { x: w.x, y: w.y, hole: w.inHole, alive: w.alive });
  }
}

export function drawOverlay(r: Renderer, worms: Worm[], dt: number, countdown: number | null, banner: string | null) {
  const { octx } = r;
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, r.overlay.width, r.overlay.height);
  const dpr = r.overlay.width / FIELD_W;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!r.reduced) {
    r.trauma = Math.max(0, r.trauma - dt * 2.4);
    r.flash = Math.max(0, r.flash - dt * 4);
  } else {
    r.trauma = 0;
    r.flash = Math.max(0, r.flash - dt * 6);
  }

  const shake = r.trauma * r.trauma;
  const ox = r.reduced ? 0 : (Math.random() * 2 - 1) * 10 * shake;
  const oy = r.reduced ? 0 : (Math.random() * 2 - 1) * 10 * shake;
  octx.save();
  octx.translate(ox, oy);

  for (const w of worms) {
    if (!w.alive && !r.last.get(w.id)?.alive) continue;
    const fx = -Math.sin(w.yaw);
    const fy = -Math.cos(w.yaw);
    if (w.alive) {
      octx.strokeStyle = "rgba(242,242,244,0.55)";
      octx.lineWidth = 2;
      octx.beginPath();
      octx.moveTo(w.x, w.y);
      octx.lineTo(w.x + fx * 16, w.y + fy * 16);
      octx.stroke();

      octx.fillStyle = w.color;
      octx.beginPath();
      octx.arc(w.x, w.y, w.inHole ? RADIUS + 0.4 : RADIUS + 1.6, 0, Math.PI * 2);
      octx.fill();
      octx.fillStyle = "#fff";
      octx.globalAlpha = 0.7;
      octx.beginPath();
      octx.arc(w.x - fx * 0.6, w.y - fy * 0.6, 1.15, 0, Math.PI * 2);
      octx.fill();
      octx.globalAlpha = 1;
    }
  }

  for (let i = r.particles.length - 1; i >= 0; i--) {
    const p = r.particles[i]!;
    p.life -= dt;
    if (p.life <= 0) {
      r.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    octx.globalAlpha = p.life / p.max;
    octx.fillStyle = p.color;
    octx.fillRect(p.x, p.y, p.size, p.size);
  }
  octx.globalAlpha = 1;

  if (r.flash > 0) {
    octx.fillStyle = `rgba(255,255,255,${0.07 * r.flash})`;
    octx.fillRect(0, 0, FIELD_W, FIELD_H);
  }

  if (countdown != null && countdown >= 0) {
    octx.fillStyle = "rgba(242,242,244,0.92)";
    octx.font = "600 96px Outfit, sans-serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText(countdown === 0 ? "GO" : String(countdown), FIELD_W / 2, FIELD_H / 2);
  }

  if (banner) {
    octx.fillStyle = "rgba(7,7,8,0.55)";
    octx.fillRect(0, FIELD_H / 2 - 48, FIELD_W, 96);
    octx.fillStyle = "#f2f2f4";
    octx.font = "500 36px Outfit, sans-serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText(banner, FIELD_W / 2, FIELD_H / 2);
  }

  octx.restore();
}

export function shakeOffset(r: Renderer): { x: number; y: number } {
  if (r.reduced || r.trauma <= 0) return { x: 0, y: 0 };
  const s = r.trauma * r.trauma;
  return { x: (Math.random() * 2 - 1) * 7 * s, y: (Math.random() * 2 - 1) * 7 * s };
}
