import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initMotion, resetMotionForTests } from "./motion";

// A stand-in IntersectionObserver the test can drive: `fire(el)` reports el as on screen.
let observed: Set<Element>;
let callback: IntersectionObserverCallback;
class ControlledObserver {
  constructor(cb: IntersectionObserverCallback) {
    callback = cb;
  }
  observe(el: Element) {
    observed.add(el);
  }
  unobserve(el: Element) {
    observed.delete(el);
  }
  disconnect() {
    observed.clear();
  }
}
const fire = (el: Element) =>
  callback([{ target: el, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

// jsdom has no layout, so each element says where it is through a data attribute.
const at = (top: number, attrs = 'data-reveal="up"') => `<div ${attrs} data-top="${top}"></div>`;

describe("initMotion", () => {
  const realIO = globalThis.IntersectionObserver;
  const realRect = Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    observed = new Set();
    resetMotionForTests();
    globalThis.IntersectionObserver = ControlledObserver as unknown as typeof IntersectionObserver;
    Element.prototype.getBoundingClientRect = function () {
      return { top: Number(this.getAttribute("data-top") ?? 0) } as DOMRect;
    };
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  });

  afterEach(() => {
    globalThis.IntersectionObserver = realIO;
    Element.prototype.getBoundingClientRect = realRect;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("leaves what is already on screen as painted, and only waits on what is below the fold", () => {
    document.body.innerHTML = at(100) + at(-500) + at(1200) + at(2000, 'class="section-divider"');
    const [onScreen, scrolledPast, below, divider] = Array.from(document.body.children);

    initMotion();

    expect(document.documentElement.hasAttribute("data-motion")).toBe(true);
    expect(onScreen.hasAttribute("data-shown")).toBe(true);
    expect(scrolledPast.hasAttribute("data-shown")).toBe(true);
    expect(below.hasAttribute("data-shown")).toBe(false);
    expect(observed).toEqual(new Set([below, divider]));
  });

  it("shows an element when it scrolls into view, then stops watching it", () => {
    document.body.innerHTML = at(1200);
    const el = document.body.firstElementChild!;
    initMotion();

    fire(el);

    expect(el.hasAttribute("data-shown")).toBe(true);
    expect(observed.has(el)).toBe(false);
  });

  it("picks up content mounted later, e.g. after a client-side navigation", async () => {
    initMotion();
    const wrapper = document.createElement("section");
    wrapper.innerHTML = at(1500, 'data-reveal="stagger"');
    document.body.appendChild(wrapper);

    await Promise.resolve(); // MutationObserver callbacks are microtasks

    expect(observed.has(wrapper.firstElementChild!)).toBe(true);
  });

  it("does nothing for visitors who asked for reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    document.body.innerHTML = at(1200);

    initMotion();

    expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
    expect(observed.size).toBe(0);
  });

  it("starts once however many times it is called", () => {
    document.body.innerHTML = at(1200);
    initMotion();
    const first = callback;
    initMotion();
    expect(callback).toBe(first);
  });
});
