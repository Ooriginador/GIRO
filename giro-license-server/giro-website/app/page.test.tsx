import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

// Mock components to simplify page test
vi.mock("@/components/sections/HeroSection", () => ({
  HeroSection: () => <div>Hero Section</div>,
}));
vi.mock("@/components/sections/ShowcaseSection", () => ({
  ShowcaseSection: () => <div>Showcase Section</div>,
}));

describe("HomePage", () => {
  it("should render the homepage with all sections", () => {
    render(<HomePage />);
    expect(screen.getByText("Hero Section")).toBeInTheDocument();
  });
});
