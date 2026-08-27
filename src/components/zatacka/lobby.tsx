import { Check, Copy, Minus, Plus, Signal, WifiOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TitleMark } from "./title-mark";
import type { HudState } from "@/game/session";
import type { SimSettings } from "@/game/sim";
import type { PeerInfo } from "@/lib/multiplayer";
import { cn } from "@/lib/utils";
import { MenuShell } from "./menu";

function playerLabel({
  you,
  isRoomHost,
  kind,
  peer,
}: {
  you: boolean;
  isRoomHost: boolean;
  kind: string;
  peer?: PeerInfo;
}) {
  if (kind === "bot") return "Bot";
  if (you && isRoomHost) return "You · host";
  if (you) return "You";
  if (isRoomHost) return "Host";
  if (peer?.connectionState === "failed") return "Unreachable";
  if (peer && !peer.reliableReady) return "Connecting";
  return "Peer";
}

export function LobbyView({
  code,
  hud,
  settings,
  peers,
  botCount,
  joined,
  selfId,
  signalError,
  onBots,
  onSettings,
  onStart,
  onLeave,
}: {
  code: string;
  hud: HudState;
  settings: SimSettings;
  peers: PeerInfo[];
  botCount: number;
  joined: boolean;
  selfId: string;
  signalError?: string | null;
  onBots: (n: number) => void;
  onSettings: (s: Partial<SimSettings>) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/r/${code}` : code;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const humans = hud.worms.filter((w) => w.kind !== "bot").length;
  const total = hud.worms.length;
  const canStart = hud.host && total >= 2;
  const seated = joined || Boolean(hud.hostId);

  return (
    <MenuShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <button type="button" onClick={onLeave} className="mb-4 text-sm text-muted hover:text-fg">
            Leave room
          </button>
          <TitleMark size="sm" />
          <p className="mt-3 text-sm text-muted">
            {!seated
              ? "Connecting to the lobby…"
              : hud.host
                ? "You are the host. Share the code — friends join on this same app."
                : "Joined. Waiting for the host to start."}
          </p>
          {signalError && !hud.connected ? (
            <p className="mt-2 text-sm text-danger">
              Matchmaking is retrying — you can still add bots and play here.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[16px] bg-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_12%,transparent)]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Room</p>
            <p className="font-mono text-2xl tracking-[0.28em] text-fg">{code}</p>
          </div>
          <Button variant="secondary" onClick={() => void share()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        <ul className="flex flex-col gap-2">
          {hud.worms.map((w) => {
            const peer = peers.find((p) => p.id === w.id);
            const you = w.id === selfId;
            const isRoomHost = Boolean(hud.hostId) && w.id === hud.hostId;
            const label = playerLabel({
              you,
              isRoomHost,
              kind: w.kind,
              peer,
            });
            return (
              <li
                key={w.id}
                className="flex items-center gap-3 rounded-[16px] bg-surface px-3 py-2.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]"
              >
                <span className="size-3 rounded-full" style={{ background: w.color }} />
                <span className="flex-1 text-sm font-medium">{w.name}</span>
                <span className="text-xs text-muted">{label}</span>
                {w.kind !== "bot" && peer && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    {peer.connectionState === "connected" && peer.reliableReady ? (
                      <Signal className="size-3.5 text-ok" />
                    ) : peer.connectionState === "failed" ? (
                      <WifiOff className="size-3.5 text-danger" />
                    ) : (
                      <Signal className="size-3.5 opacity-40" />
                    )}
                    {peer.connectionState === "failed"
                      ? "Unreachable"
                      : peer.reliableReady && peer.rttMs != null
                        ? `${peer.rttMs}ms`
                        : null}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {hud.host && (
          <>
            <div className="flex items-center justify-between rounded-[16px] bg-surface px-3 py-2.5">
              <span className="text-sm">Bots</span>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  onClick={() => onBots(botCount - 1)}
                  aria-label="Fewer bots"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-6 text-center font-mono tabular-nums">{botCount}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  onClick={() => onBots(botCount + 1)}
                  aria-label="More bots"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Toggle
                label="Holes"
                on={settings.holes}
                onClick={() => onSettings({ holes: !settings.holes })}
              />
              <div className="flex h-11 overflow-hidden rounded-[var(--radius-md)] bg-surface-2 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)]">
                {(
                  [
                    [0.8, "Slow"],
                    [1, "Classic"],
                    [1.25, "Fast"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onSettings({ speed: v })}
                    className={cn(
                      "h-full flex-1 text-xs font-medium",
                      settings.speed === v ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {!seated ? (
            <p className="text-sm text-muted">Connecting…</p>
          ) : hud.host ? (
            <Button size="xl" onClick={onStart} disabled={!canStart} className="sm:flex-1">
              Start match
            </Button>
          ) : (
            <p className="text-sm text-muted">Waiting for the host to start.</p>
          )}
        </div>
        {hud.host && total < 2 && (
          <p className="text-sm text-muted">
            Invite a friend or add a bot. {humans} human{humans === 1 ? "" : "s"} in the room.
          </p>
        )}
      </div>
    </MenuShell>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-[var(--radius-md)] text-sm font-medium",
        on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
      )}
    >
      {label}: {on ? "On" : "Off"}
    </button>
  );
}
