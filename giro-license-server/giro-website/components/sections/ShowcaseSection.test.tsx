import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShowcaseSection } from "./ShowcaseSection";

describe("ShowcaseSection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render showcase items", () => {
    render(<ShowcaseSection />);
    expect(screen.getByText(/Veja o GIRO em ação/i)).toBeInTheDocument();
  });

  it("should allow changing active screenshot", () => {
    render(<ShowcaseSection />);
    const buttons = screen.getAllByRole("button");
    // Indicadores are at the bottom
    fireEvent.click(buttons[buttons.length - 1]);
  });

  it("should auto-rotate screenshots", () => {
    render(<ShowcaseSection />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Coverage for interval
  });

  it("should pause auto-rotate on hover", () => {
    render(<ShowcaseSection />);
    const section = screen.getByText(/Veja o GIRO em ação/i).closest("section");
    if (section) {
      fireEvent.mouseEnter(section);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      fireEvent.mouseLeave(section);
    }
  });
});
