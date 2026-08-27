import { useEffect, useRef } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const DOM_RACE = /insertBefore|removeChild|not a child of this node/;
const RELOAD_FLAG = "zatacka-dom-race-reload";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const msg = error?.message || "An unexpected error occurred. Try reloading the page.";
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    if (!DOM_RACE.test(msg)) return;
    tried.current = true;
    try {
      if (sessionStorage.getItem(RELOAD_FLAG) === "1") return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
    } catch {
      return;
    }
    window.location.reload();
  }, [msg]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted">{msg}</p>
      <button
        type="button"
        className="mt-2 rounded-[var(--radius-md)] bg-accent px-4 py-2 text-sm text-accent-fg"
        onClick={() => {
          try {
            sessionStorage.removeItem(RELOAD_FLAG);
          } catch {
            /* ignore */
          }
          window.location.assign("/");
        }}
      >
        Back to menu
      </button>
    </main>
  );
}
