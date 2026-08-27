import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ZatackaApp } from "@/components/zatacka/app";

export const Route = createFileRoute("/_game/r/$code")({
  component: RoomPage,
});

function sanitizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 64);
}

function RoomPage() {
  const { code } = Route.useParams();
  const clean = sanitizeCode(code);
  if (!clean) return <Navigate to="/" />;
  return <ZatackaApp key={clean} initialRoom={clean} />;
}
