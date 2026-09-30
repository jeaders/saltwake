export type ButtonId = "net" | "harpoon" | "sonar" | "boost" | "pause" | "mute";
export type Action = ButtonId | "restart" | "confirm" | "dock" | "journal" | "bait" | "atlas" | "cruise" | "precision" | "zoomIn" | "zoomOut" | "interact" | "repel";

export interface Btn {
  id: ButtonId;
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  round: boolean;
}

export interface Layout {
  buttons: Btn[];
}

const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const BOOST_KEYS = ["ShiftLeft", "ShiftRight", "KeyB", "KeyV"];
const KEY_ACTIONS: Record<string, Action[]> = {
  Space: ["net", "confirm"],
  KeyJ: ["net"],
  Digit1: ["net"],
  KeyX: ["harpoon"],
  KeyK: ["harpoon"],
  Digit2: ["harpoon"],
  KeyC: ["sonar"],
  KeyL: ["sonar"],
  Digit3: ["sonar"],
  Escape: ["pause"],
  KeyP: ["pause"],
  KeyM: ["mute"],
  KeyR: ["restart"],
  Enter: ["confirm"],
  KeyE: ["dock"],
  KeyI: ["journal"],
  KeyF: ["bait"],
  KeyH: ["repel"],
  Tab: ["atlas"],
  KeyG: ["atlas"],
  KeyQ: ["cruise"],
  KeyZ: ["precision"],
  Equal: ["zoomIn"],
  NumpadAdd: ["zoomIn"],
  Minus: ["zoomOut"],
  NumpadSubtract: ["zoomOut"],
};

interface PointerRole {
  kind: "stick" | "btn";
  id?: ButtonId;
}

export class Input {
  keys = new Set<string>();
  touchMode = false;
  layout: Layout = { buttons: [] };
  ui = 1;
  W = 800;
  H = 600;
  boostLatch = false;
  private mouseBoost = false;
  private pressedSet = new Set<Action>();
  private pointers = new Map<number, PointerRole>();
  stick = { active: false, id: -1, ox: 0, oy: 0, px: 0, py: 0, x: 0, y: 0 };
  onGesture: (() => void) | null = null;
  onWorldClick: ((x: number, y: number) => void) | null = null;
  onZoom: ((delta: number) => void) | null = null;
  private canvas: HTMLCanvasElement;
  private cleanup: (() => void)[] = [];
  private gamepadPoll = false;

  constructor(canvas: HTMLCanvasElement, initialTouch: boolean) {
    this.canvas = canvas;
    this.touchMode = initialTouch;
    const on = <K extends keyof WindowEventMap>(t: Window, k: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
      t.addEventListener(k, fn as EventListener, o);
      this.cleanup.push(() => t.removeEventListener(k, fn as EventListener));
    };
    on(window, "keydown", (e) => this.keyDown(e));
    on(window, "keyup", (e) => this.keyUp(e));
    on(window, "blur", () => this.releaseAll());
    on(window, "gamepadconnected", () => { this.gamepadPoll = true; });
    on(window, "gamepaddisconnected", () => { this.gamepadPoll = false; });

    const c = canvas;
    const add = (k: string, fn: (e: PointerEvent) => void) => {
      c.addEventListener(k, fn as EventListener);
      this.cleanup.push(() => c.removeEventListener(k, fn as EventListener));
    };
    add("pointerdown", (e) => this.pointerDown(e));
    add("pointermove", (e) => this.pointerMove(e));
    add("pointerup", (e) => this.pointerUp(e));
    add("pointercancel", (e) => this.pointerUp(e));
    const prevent = (e: Event) => e.preventDefault();
    const wheel = (e: WheelEvent) => { e.preventDefault(); this.onZoom?.(e.deltaY > 0 ? -1 : 1); };
    c.addEventListener("wheel", wheel, { passive: false });
    this.cleanup.push(() => c.removeEventListener("wheel", wheel));
    c.addEventListener("contextmenu", prevent);
    c.addEventListener("gesturestart", prevent as EventListener);
    this.cleanup.push(() => {
      c.removeEventListener("contextmenu", prevent);
      c.removeEventListener("gesturestart", prevent as EventListener);
    });
  }

  pollGamepad() {
    if (!this.gamepadPoll) return;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    for (let i = 0; i < gps.length; i++) {
      if (gps[i]) { gp = gps[i]; break; }
    }
    if (!gp) return;
    const dead = 0.28;
    const lx = Math.abs(gp.axes[0]) > dead ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > dead ? gp.axes[1] : 0;
    if (lx !== 0 || ly !== 0) {
      const l = Math.hypot(lx, ly) || 1;
      const nx = (lx / l) * Math.min(1, (Math.hypot(lx, ly) - dead) / (1 - dead) * 1.15);
      const ny = (ly / l) * Math.min(1, (Math.hypot(lx, ly) - dead) / (1 - dead) * 1.15);
      this.stick.x = nx; this.stick.y = ny; this.stick.active = true;
    } else if (this.stick.active) {
      this.stick.x = 0; this.stick.y = 0; this.stick.active = false;
    }
    if (gp.buttons[0]?.value > 0.5) this.press("confirm");
    if (gp.buttons[1]?.value > 0.5) this.press("net");
    if (gp.buttons[2]?.value > 0.5) this.press("confirm");
    if (gp.buttons[3]?.value > 0.5) this.press("harpoon");
    if (gp.buttons[4]?.value > 0.5) this.press("sonar");
    if (gp.buttons[5]?.value > 0.5) this.press("boost");
    if (gp.buttons[9]?.value > 0.5) this.press("pause");
  }

  destroy() {
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
  }

  // ------------------------------------------------------------- queries
  consume(a: Action): boolean {
    if (this.pressedSet.has(a)) {
      this.pressedSet.delete(a);
      return true;
    }
    return false;
  }
  clearPressed() {
    this.pressedSet.clear();
  }
  press(a: Action) {
    this.pressedSet.add(a);
  }

  boostHeld(): boolean {
    for (const k of BOOST_KEYS) if (this.keys.has(k)) return true;
    return this.boostLatch || this.mouseBoost;
  }

  /** Writes movement vector (|v| <= 1) into out. */
  getMove(out: { x: number; y: number }) {
    const k = this.keys;
    let x = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    let y = (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) - (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0);
    if (x !== 0 || y !== 0) {
      const l = Math.hypot(x, y);
      x /= l;
      y /= l;
    } else if (this.stick.active) {
      x = this.stick.x;
      y = this.stick.y;
    }
    out.x = x;
    out.y = y;
  }

  releaseAll() {
    this.keys.clear();
    this.pointers.clear();
    this.stick.active = false;
    this.stick.x = this.stick.y = 0;
    this.mouseBoost = false;
    this.boostLatch = false;
    this.pressedSet.clear();
  }

  // ------------------------------------------------------------ keyboard
  private keyDown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const form=t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.tagName==="SELECT");
    if(form&&e.code!=="Escape")return;
    if(t?.closest("[data-block-gamekeys]")&&!["Escape","KeyE"].includes(e.code))return;
    if(form&&e.code==="Escape")t.blur();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const code = e.code;
    if (MOVE_KEYS.has(code) || code === "Space" || code === "Tab" || code.startsWith("Shift")) e.preventDefault();
    if (this.touchMode) this.touchMode = false;
    this.keys.add(code);
    if (e.repeat) return;
    this.onGesture?.();
    const acts = KEY_ACTIONS[code];
    if (acts) for (const a of acts) this.pressedSet.add(a);
    if (BOOST_KEYS.includes(code)) this.pressedSet.add("boost");
  }
  private keyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  // ------------------------------------------------------------- pointer
  private pos(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private hit(x: number, y: number): Btn | null {
    const pad = this.touchMode ? 10 : 2;
    for (const b of this.layout.buttons) {
      if (b.round) {
        if (Math.hypot(x - b.cx, y - b.cy) <= b.hw + pad) return b;
      } else if (Math.abs(x - b.cx) <= b.hw + pad && Math.abs(y - b.cy) <= b.hh + pad) return b;
    }
    return null;
  }

  private pointerDown(e: PointerEvent) {
    const isTouch = e.pointerType !== "mouse";
    this.touchMode = isTouch;
    this.onGesture?.();
    const { x, y } = this.pos(e);
    const b = this.hit(x, y);
    if (b) {
      this.canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { kind: "btn", id: b.id });
      if (b.id === "boost") {
        if (isTouch) {
          this.boostLatch = !this.boostLatch;
          if (this.boostLatch) this.pressedSet.add("boost");
        } else {
          this.mouseBoost = true;
          this.pressedSet.add("boost");
        }
      } else {
        this.pressedSet.add(b.id);
      }
      return;
    }
    if (!isTouch || x > this.W * 0.62) { this.onWorldClick?.(x,y); return; }
    if (isTouch && !this.stick.active && x < this.W * 0.62) {
      this.canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { kind: "stick" });
      const s = this.stick;
      s.active = true;
      s.id = e.pointerId;
      s.ox = x;
      s.oy = y;
      s.px = x;
      s.py = y;
      s.x = 0;
      s.y = 0;
    }
  }

  private pointerMove(e: PointerEvent) {
    const role = this.pointers.get(e.pointerId);
    if (!role || role.kind !== "stick") return;
    const { x, y } = this.pos(e);
    const s = this.stick;
    const R = 54 * this.ui;
    let dx = x - s.ox;
    let dy = y - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      // floating stick: drag the origin along so the thumb never "runs out"
      const k = (d - R) / d;
      s.ox += dx * k;
      s.oy += dy * k;
      dx = x - s.ox;
      dy = y - s.oy;
    }
    s.px = x;
    s.py = y;
    const mag = Math.min(1, Math.hypot(dx, dy) / R);
    const dead = 0.14;
    if (mag < dead) {
      s.x = 0;
      s.y = 0;
    } else {
      const m = (mag - dead) / (1 - dead);
      const l = Math.hypot(dx, dy) || 1;
      s.x = (dx / l) * Math.min(1, m * 1.15);
      s.y = (dy / l) * Math.min(1, m * 1.15);
    }
  }

  private pointerUp(e: PointerEvent) {
    const role = this.pointers.get(e.pointerId);
    if (!role) return;
    this.pointers.delete(e.pointerId);
    if (role.kind === "stick") {
      this.stick.active = false;
      this.stick.x = 0;
      this.stick.y = 0;
    } else if (role.id === "boost" && !this.touchMode) {
      this.mouseBoost = false;
    }
  }
}
