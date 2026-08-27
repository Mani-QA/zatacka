import { createFileRoute } from "@tanstack/react-router";
import { ZatackaApp } from "@/components/zatacka/app";

export const Route = createFileRoute("/_game/")({
  component: Home,
});

function Home() {
  return <ZatackaApp />;
}
