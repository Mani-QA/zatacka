import { Component, type ErrorInfo, type ReactNode } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_game")({
  component: GameLayout,
});

function GameLayout() {
  // Real DOM host (not a fragment). Sibling fragments + <Outlet /> swapping
  // a large tree in the same commit is what throws insertBefore in WebViews.
  return (
    <div id="zatacka-game" className="min-h-dvh bg-bg text-fg">
      <DomRaceBoundary>
        <Outlet />
      </DomRaceBoundary>
    </div>
  );
}

type BoundaryState = { error: Error | null; gen: number };

class DomRaceBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null, gen: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    const msg = error.message || "";
    const race =
      msg.includes("insertBefore") ||
      msg.includes("removeChild") ||
      msg.includes("not a child of this node");
    if (!race || this.state.gen >= 2) return;
    const gen = this.state.gen + 1;
    window.setTimeout(() => this.setState({ error: null, gen }), 0);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "";
      const race =
        msg.includes("insertBefore") ||
        msg.includes("removeChild") ||
        msg.includes("not a child of this node");
      if (!race || this.state.gen >= 2) throw this.state.error;
      return <div className="min-h-dvh bg-bg" />;
    }
    return (
      <div key={this.state.gen} className="min-h-dvh bg-bg text-fg">
        {this.props.children}
      </div>
    );
  }
}
