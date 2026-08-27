import type { ReactNode } from "react";
import { Globe, Keyboard, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TitleMark } from "./title-mark";
import { DEFAULT_BINDS, PLAYER_COLORS } from "@/game/constants";
import { cn } from "@/lib/utils";

export function MenuShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-dvh overflow-hidden bg-bg text-fg">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, color-mix(in oklab, var(--color-p1) 18%, transparent), transparent 42%), radial-gradient(ellipse at 80% 100%, color-mix(in oklab, var(--color-p2) 12%, transparent), transparent 40%)",
        }}
      />
      <div className="relative z-10 flex h-full flex-col overflow-x-hidden overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-5xl px-5 py-8 pb-20 sm:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MenuView({
  name,
  onName,
  joinCode,
  onJoinCode,
  onPlay,
  onLocal,
  onCreate,
  onJoin,
}: {
  name: string;
  onName: (v: string) => void;
  joinCode: string;
  onJoinCode: (v: string) => void;
  onPlay: () => void;
  onLocal: () => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <MenuShell>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-10 lg:gap-y-6">
        <div className="stagger-in flex flex-col gap-6">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-muted">
              Achtung, die Kurve
            </p>
            <TitleMark />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              You only turn left or right. Your line never stops. Gaps open so others can slip
              through — or so you can. Last curve standing takes the round.
            </p>
          </div>

          <label className="flex max-w-xs flex-col gap-2">
            <span className="text-xs font-medium text-muted">Callsign</span>
            <Input
              value={name}
              maxLength={16}
              onChange={(e) => onName(e.target.value)}
              placeholder="Pilot"
              autoComplete="nickname"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="xl" className="min-h-12" onClick={onPlay}>
              <Play className="size-4" fill="currentColor" />
              Play now
            </Button>
            <Button size="lg" variant="secondary" onClick={onLocal}>
              <Users className="size-4" />
              Local setup
            </Button>
          </div>
        </div>

        <HowTo />

        <div className="max-w-xl rounded-[28px] bg-surface p-5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Globe className="size-4 text-muted" />
            Internet match
          </div>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Open a private room and send the code. Peers connect directly — the server only
            introduces you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={onCreate}
              className="sm:shrink-0"
              data-testid="create-room"
            >
              Create room
            </Button>
            <div className="flex min-w-0 flex-1 gap-2">
              <Input
                value={joinCode}
                onChange={(e) => onJoinCode(e.target.value.toUpperCase())}
                placeholder="Room code"
                maxLength={8}
                className="font-mono uppercase tracking-widest"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onJoin();
                }}
              />
              <Button variant="outline" onClick={onJoin} disabled={joinCode.trim().length < 4}>
                Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MenuShell>
  );
}

function HowTo() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:row-span-2 lg:grid-cols-1 lg:self-start">
      <Hint
        icon={<Keyboard className="size-4" />}
        title="Steer"
        body="Hold left / right — arrows, A D, or mouse buttons. On a phone, the two pads."
      />
      <Hint
        title="Gaps"
        body="Your trail blinks open every beat. Cut through a hole. Never hit a wall or a line."
      />
      <Hint
        title="Score"
        body="Everyone still alive scores when a curve dies. First to the target wins the match."
      />
    </div>
  );
}

function Hint({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-surface/80 p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_8%,transparent)]">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
        {icon}
        {title}
      </div>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

export function LocalSetupView({
  slots,
  setKind,
  speed,
  setSpeed,
  holes,
  setHoles,
  barriers,
  setBarriers,
  target,
  setTarget,
  onStart,
  onBack,
}: {
  slots: { kind: "human" | "bot" | "off"; name: string }[];
  setKind: (i: number, k: "human" | "bot" | "off") => void;
  speed: number;
  setSpeed: (n: number) => void;
  holes: boolean;
  setHoles: (v: boolean) => void;
  barriers: number;
  setBarriers: (n: number) => void;
  target: number;
  setTarget: (n: number) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const active = slots.filter((s) => s.kind !== "off").length;
  return (
    <MenuShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-sm text-muted hover:text-fg"
          >
            Back
          </button>
          <h2 className="font-display text-4xl">Local match</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Same keyboard, up to six curves. Bots fill empty seats.
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {slots.map((s, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-[16px] bg-surface px-3 py-2.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]"
            >
              <span
                className="size-3 rounded-full"
                style={{ background: PLAYER_COLORS[i]?.fill }}
              />
              <span className="w-24 text-sm font-medium">{PLAYER_COLORS[i]?.name}</span>
              <span className="hidden flex-1 font-mono text-xs text-muted sm:block">
                {s.kind === "human" ? DEFAULT_BINDS[i]?.label : s.kind === "bot" ? "CPU" : "—"}
              </span>
              <div className="ml-auto flex gap-1">
                {(["human", "bot", "off"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(i, k)}
                    className={cn(
                      "h-8 rounded-[8px] px-2.5 text-xs font-medium capitalize",
                      s.kind === k ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {k === "off" ? "Off" : k === "bot" ? "Bot" : "Human"}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Speed">
            <select
              className="h-11 w-full rounded-[var(--radius-md)] bg-surface-2 px-3 text-sm text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)]"
              value={String(speed)}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value="0.8">Slow</option>
              <option value="1">Classic</option>
              <option value="1.25">Fast</option>
            </select>
          </Field>
          <Field label="First to">
            <select
              className="h-11 w-full rounded-[var(--radius-md)] bg-surface-2 px-3 text-sm text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)]"
              value={String(target)}
              onChange={(e) => setTarget(Number(e.target.value))}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
            </select>
          </Field>
          <Field label="Holes">
            <button
              type="button"
              onClick={() => setHoles(!holes)}
              className={cn(
                "h-11 w-full rounded-[var(--radius-md)] text-sm font-medium",
                holes ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
              )}
            >
              {holes ? "On" : "Off"}
            </button>
          </Field>
          <Field label="Barriers">
            <select
              className="h-11 w-full rounded-[var(--radius-md)] bg-surface-2 px-3 text-sm text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)]"
              value={String(barriers)}
              onChange={(e) => setBarriers(Number(e.target.value))}
            >
              <option value="0">None</option>
              <option value="6">Few</option>
              <option value="12">Many</option>
            </select>
          </Field>
        </div>

        <Button size="xl" onClick={onStart} disabled={active < 2}>
          <Play className="size-4" fill="currentColor" />
          Start match
        </Button>
        {active < 2 && (
          <p className="text-sm text-muted">Need at least two curves — add a bot or a human.</p>
        )}
      </div>
    </MenuShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
