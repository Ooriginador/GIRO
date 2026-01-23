import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileSection } from "./MobileSection";

describe("MobileSection", () => {
  it("should render mobile section content", () => {
    render(<MobileSection />);
    expect(screen.getByText(/Gerencie seu negócio de/i)).toBeInTheDocument();
    expect(screen.getByText(/qualquer lugar/i)).toBeInTheDocument();
    expect(screen.getByText(/Com o app GIRO Mobile/i)).toBeInTheDocument();
  });

  it("should show Em Breve badges", () => {
    render(<MobileSection />);
    const badges = screen.getAllByText(/Em Breve/i);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });
});
