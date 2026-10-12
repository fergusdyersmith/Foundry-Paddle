import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CountUp from "./CountUp";

describe("CountUp", () => {
  const realRect = Element.prototype.getBoundingClientRect;
  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect;
  });

  it("renders the final figure, which is what the prerendered HTML carries", () => {
    render(<CountUp value={18600} />);
    expect(screen.getByText("18,600")).toBeInTheDocument();
  });

  it("keeps the painted value for a figure already on screen at hydration", () => {
    render(<CountUp value={43} suffix=" ft" />);
    expect(screen.getByText("43 ft")).toBeInTheDocument();
  });

  it("starts from zero below the fold, and still re-renders when its value changes", () => {
    Element.prototype.getBoundingClientRect = () => ({ top: 5000 }) as DOMRect;
    const { container, rerender } = render(<CountUp value={250} />);
    expect(container.textContent).toBe("0");

    // React must still own the text node the count edits, or this update would be lost.
    rerender(<CountUp value={300} />);
    expect(container.textContent).toBe("0"); // the new count restarts from zero
    Element.prototype.getBoundingClientRect = realRect;
    rerender(<CountUp value={301} />);
    expect(container.textContent).toBe("301");
  });
});
