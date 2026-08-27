import { Pause, Volume2, VolumeX, Flag } from "lucide-react";
import type { HudState } from "@/game/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScoreHud({
  hud,
  muted,
  onMute,
  onLeave,
  onPause,
}: {
  hud: HudState;
  muted: boolean;
  onMute: () => void;
  onLeave: () => void;
  onPause?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {hud.worms.map((w) => (
          <div
            key={w.id}
            className={cn(
              "flex items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-1.5",
              "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
              !w.alive && hud.phase === "playing" && "opacity-40",
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: w.color }}
              aria-hidden
            />
            <span className="max-w-20 truncate text-xs font-medium text-fg sm:max-w-28">
              {w.name}
            </span>
            <span className="font-mono text-sm tabular-nums text-fg">{w.score}</span>
          </div>
        ))}
      </div>
      <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
        <span className="tabular-nums">
          Round {hud.round} · first to {hud.target}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {onPause && (
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={onPause}
            aria-label="Pause"
          >
            <Pause className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onMute}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={onLeave} className="gap-1.5">
          <Flag className="size-3.5" />
          Leave
        </Button>
      </div>
    </div>
  );
}
