import type { PointerEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Input } from "@/game/input";

export function TouchControls({ input }: { input: Input }) {
  const bind = (side: "left" | "right") => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (side === "left") input.touchLeft = true;
      else input.touchRight = true;
    },
    onPointerUp: () => {
      if (side === "left") input.touchLeft = false;
      else input.touchRight = false;
    },
    onPointerCancel: () => {
      if (side === "left") input.touchLeft = false;
      else input.touchRight = false;
    },
  });

  return (
    <div className="flex gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <button
        type="button"
        aria-label="Turn left"
        className="flex h-16 flex-1 items-center justify-center rounded-[20px] bg-surface-2 text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_12%,transparent)] active:bg-surface touch-none"
        style={{ touchAction: "none" }}
        {...bind("left")}
      >
        <ArrowLeft className="size-7" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="Turn right"
        className="flex h-16 flex-1 items-center justify-center rounded-[20px] bg-surface-2 text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_12%,transparent)] active:bg-surface touch-none"
        style={{ touchAction: "none" }}
        {...bind("right")}
      >
        <ArrowRight className="size-7" strokeWidth={2} />
      </button>
    </div>
  );
}
