import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CountUp from "@/components/CountUp";
import TypingIndicator from "@/components/TypingIndicator";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mockMotion(matches: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches,
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return { change: () => { media.matches = true; listeners.forEach((listener) => listener()); } };
}

describe("Kashie presentation motion", () => {
  it("shows exact financial values without animating for reduced motion", () => {
    mockMotion(true);
    const frame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", frame);
    render(<CountUp value={-125000} format={(n) => `UGX ${n}`} />);
    expect(screen.getByText("UGX -125000")).toBeInTheDocument();
    expect(frame).not.toHaveBeenCalled();
  });

  it("settles immediately when reduced motion is enabled during a count-up", () => {
    const media = mockMotion(false);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<CountUp value={50000} format={(n) => `UGX ${n}`} />);
    expect(screen.getByLabelText("UGX 50000")).toHaveTextContent("UGX 0");
    act(() => media.change());
    expect(screen.getByLabelText("UGX 50000")).toHaveTextContent("UGX 50000");
  });

  it("identifies the thinking state accessibly without claiming success", () => {
    render(<TypingIndicator />);
    expect(screen.getByRole("status", { name: "Kashie is thinking" })).toBeInTheDocument();
    expect(document.querySelectorAll(".kashie-thinking-bar")).toHaveLength(3);
  });
});