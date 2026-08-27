const GAME_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyA",
  "KeyD",
  "KeyJ",
  "KeyL",
  "KeyC",
  "KeyV",
  "KeyN",
  "KeyM",
  "KeyW",
  "KeyS",
  "Numpad4",
  "Numpad6",
  "Escape",
]);

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class Input {
  keys = new Set<string>();
  mouseLeft = false;
  mouseRight = false;
  touchLeft = false;
  touchRight = false;
  padSteer = 0;
  /** +1 = player-visible left, −1 = right. Injected by QA. */
  injectedSteer: number | null = null;
  justPressed = new Set<string>();
  private prevKeys = new Set<string>();
  private attached = false;
  private onKeyDown?: (e: KeyboardEvent) => void;
  private onKeyUp?: (e: KeyboardEvent) => void;
  private onBlur?: () => void;
  private onMouseDown?: (e: MouseEvent) => void;
  private onMouseUp?: (e: MouseEvent) => void;
  private onContext?: (e: Event) => void;

  attach() {
    if (this.attached || typeof window === "undefined") return;
    this.attached = true;
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (GAME_CODES.has(e.code)) e.preventDefault();
    };
    this.onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this.onBlur = () => {
      this.keys.clear();
      this.mouseLeft = false;
      this.mouseRight = false;
      this.touchLeft = false;
      this.touchRight = false;
    };
    this.onMouseDown = (e) => {
      if (e.button === 0) this.mouseLeft = true;
      if (e.button === 2) this.mouseRight = true;
    };
    this.onMouseUp = (e) => {
      if (e.button === 0) this.mouseLeft = false;
      if (e.button === 2) this.mouseRight = false;
    };
    this.onContext = (e) => e.preventDefault();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("contextmenu", this.onContext);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    if (this.onKeyDown) window.removeEventListener("keydown", this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener("keyup", this.onKeyUp);
    if (this.onBlur) {
      window.removeEventListener("blur", this.onBlur);
      document.removeEventListener("visibilitychange", this.onBlur);
    }
    if (this.onMouseDown) window.removeEventListener("mousedown", this.onMouseDown);
    if (this.onMouseUp) window.removeEventListener("mouseup", this.onMouseUp);
    if (this.onContext) window.removeEventListener("contextmenu", this.onContext);
  }

  poll() {
    this.justPressed.clear();
    for (const c of this.keys) {
      if (!this.prevKeys.has(c)) this.justPressed.add(c);
    }
    this.prevKeys = new Set(this.keys);

    this.padSteer = 0;
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : [];
    if (pads) {
      for (const pad of pads) {
        if (!pad) continue;
        const axes = pad.axes;
        const stick = radialDeadzone(axes[0] ?? 0, axes[1] ?? 0);
        // Stick left = player left = +steer
        if (stick.x < -0.2) this.padSteer += 1;
        if (stick.x > 0.2) this.padSteer -= 1;
        if (pad.buttons[14]?.pressed) this.padSteer += 1;
        if (pad.buttons[15]?.pressed) this.padSteer -= 1;
      }
    }
  }

  pair(leftCode: string, rightCode: string, extras?: { mouse?: boolean; pad?: boolean; wasd?: boolean; touch?: boolean }) {
    if (this.injectedSteer != null) {
      return {
        left: this.injectedSteer > 0.2,
        right: this.injectedSteer < -0.2,
      };
    }
    let left = this.keys.has(leftCode);
    let right = this.keys.has(rightCode);
    if (extras?.wasd) {
      left = left || this.keys.has("KeyA") || this.keys.has("ArrowLeft");
      right = right || this.keys.has("KeyD") || this.keys.has("ArrowRight");
    }
    if (extras?.mouse) {
      left = left || this.mouseLeft;
      right = right || this.mouseRight;
    }
    if (extras?.touch) {
      left = left || this.touchLeft;
      right = right || this.touchRight;
    }
    if (extras?.pad) {
      left = left || this.padSteer > 0;
      right = right || this.padSteer < 0;
    }
    return { left, right };
  }
}
