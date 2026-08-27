import { useEffect, useRef, useState } from "react";
import { FIELD_H, FIELD_W } from "@/game/constants";
import { fit } from "@/game/render";
import type { LocalSession, OnlineSession } from "@/game/session";
import type { HudState } from "@/game/session";
import { TouchControls } from "./touch-controls";
import { ScoreHud } from "./hud";
import { Button } from "@/components/ui/button";
import { audio } from "@/game/audio";

type Session = LocalSession | OnlineSession;

export function Arena({
  session,
  onLeave,
  onHud,
}: {
  session: Session;
  onLeave: () => void;
  onHud?: (h: HudState) => void;
}) {
  const trailRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudState>(session.hud);
  const [muted, setMuted] = useState(audio.muted);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const trail = trailRef.current;
    const overlay = overlayRef.current;
    if (!trail || !overlay) return;
    session.mount(trail, overlay);
    session.onHud = (h) => {
      setHud(h);
      onHud?.(h);
    };
    setHud(session.hud);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      sessionRef.current.update(dt);
      const sh = sessionRef.current.shake();
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${sh.x.toFixed(2)}px, ${sh.y.toFixed(2)}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      if (trailRef.current && overlayRef.current) fit(trailRef.current, overlayRef.current);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onLeaveRef.current();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      session.releasePlay();
    };
    // session identity is the match instance; don't retrigger on callback identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const showMatch = hud.phase === "matchend";
  const inLobby = hud.phase === "lobby";

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <ScoreHud
        hud={hud}
        muted={muted}
        onMute={() => {
          audio.unlock();
          audio.setMuted(!audio.muted);
          setMuted(audio.muted);
        }}
        onLeave={onLeave}
        onPause={() => {
          const s = sessionRef.current;
          if ("sim" in s && s.sim && s.sim.phase !== "matchend") {
            s.sim.paused = !s.sim.paused;
          }
        }}
      />

      <div className="relative mx-auto flex min-h-0 w-full flex-1 items-start justify-center px-3 pb-1 pt-1 md:items-center">
        <div
          ref={wrapRef}
          className="arena-frame scanlines vignette relative max-h-full max-w-full overflow-hidden rounded-[var(--radius-lg)] bg-arena"
          style={{
            aspectRatio: `${FIELD_W} / ${FIELD_H}`,
            width: "min(100%, calc((100dvh - 9rem) * 1.5))",
            touchAction: "none",
          }}
        >
          <canvas
            ref={trailRef}
            className="absolute inset-0 size-full"
            width={FIELD_W}
            height={FIELD_H}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 size-full"
            width={FIELD_W}
            height={FIELD_H}
          />
          {inLobby && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70">
              <p className="text-sm text-muted">Waiting for host to start…</p>
            </div>
          )}
          {showMatch && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-bg/70 px-6 text-center">
              <p className="font-display text-5xl text-fg">Match over</p>
              <p className="text-sm text-muted">
                {hud.worms.slice().sort((a, b) => b.score - a.score)[0]?.name} holds the field.
              </p>
              <div className="flex gap-2">
                {hud.host && (
                  <Button
                    onClick={() => {
                      audio.unlock();
                      session.replay();
                    }}
                  >
                    Play again
                  </Button>
                )}
                <Button variant="secondary" onClick={onLeave}>
                  Leave
                </Button>
              </div>
              <p className="text-xs text-subtle">Space to rematch</p>
            </div>
          )}
        </div>
      </div>

      <TouchControls input={session.input} />
    </div>
  );
}
