import { TITLE_LETTERS } from "@/game/constants";
import { cn } from "@/lib/utils";

export function TitleMark({ className, size = "lg" }: { className?: string; size?: "sm" | "lg" }) {
  return (
    <h1
      className={cn(
        "font-display leading-none text-balance",
        size === "lg" ? "text-6xl sm:text-7xl" : "text-4xl",
        className,
      )}
      aria-label="Zatacka"
    >
      {TITLE_LETTERS.map((l, i) => (
        <span key={`${l.ch}-${i}`} style={{ color: l.color }}>
          {l.ch}
        </span>
      ))}
    </h1>
  );
}
