import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FAQSection } from "./FAQSection";

describe("FAQSection", () => {
  it("should render all questions", () => {
    render(<FAQSection />);
    expect(
      screen.getByText(/O GIRO funciona sem internet\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Preciso pagar mensalidade\?/i)
    ).toBeInTheDocument();
  });

  it("should toggle answer when question is clicked", () => {
    render(<FAQSection />);
    const question = screen.getByText(/O GIRO funciona sem internet\?/i);

    fireEvent.click(question);

    expect(
      screen.getByText(/O GIRO Desktop funciona 100% offline/i)
    ).toBeInTheDocument();
  });

  it("should have a working support link", () => {
    render(<FAQSection />);
    const link = screen.getByRole("link", { name: /Falar com Suporte/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });
});
