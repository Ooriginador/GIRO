import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "./HeroSection";

describe("HeroSection", () => {
  const mockRelease = {
    version: "1.2.3",
    pub_date: "2024-01-01",
    assets: {
      windows: "http://win.exe",
      linux_appimage: "http://linux.AppImage",
      linux_deb: "http://linux.deb",
    },
  };

  it("should render 'Baixar Agora' if release provided", () => {
    render(<HeroSection latestRelease={mockRelease} />);
    expect(screen.getByText(/Baixar Agora/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Baixar Agora/i });
    expect(link).toHaveAttribute("href", "/downloads");
  });

  it("should render 'Ver Downloads' if no release", () => {
    render(<HeroSection latestRelease={null} />);
    expect(screen.getByText(/Ver Downloads/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Ver Downloads/i });
    expect(link).toHaveAttribute("href", "/downloads");
  });
});
