import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PricingSection } from "./PricingSection";
import * as api from "../../lib/api";

vi.mock("../../lib/api", () => ({
  createMercadoPagoPreference: vi.fn(),
}));

describe("PricingSection", () => {
  it("should render all plans", () => {
    render(<PricingSection />);
    expect(screen.getByText("Mensal")).toBeInTheDocument();
    expect(screen.getByText("Anual")).toBeInTheDocument();
    expect(screen.getByText("Vitalício")).toBeInTheDocument();
  });

  it("should call createMercadoPagoPreference when subscribing", async () => {
    (api.createMercadoPagoPreference as any).mockResolvedValue({
      init_point: "http://mp.com",
    });

    // Mock localStorage
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    getItemSpy.mockReturnValue("fake-token");

    // Mock window.location.assign
    const assignMock = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignMock, href: "" } as any;

    render(<PricingSection />);
    const subscribeButtons = screen.getAllByText(/Assinar Agora/i);
    fireEvent.click(subscribeButtons[0]); // Mensal

    await waitFor(() => {
      // The code uses: createMercadoPagoPreference(`Plano GIRO ${plan}`, price)
      // and plan is plan.name.toLowerCase()
      // So for "Mensal", it's "mensal"
      expect(api.createMercadoPagoPreference).toHaveBeenCalledWith(
        "Plano GIRO mensal",
        99.9
      );
      expect((window.location as any).href).toBe("http://mp.com");
    });
  });

  it("should alert and redirect if not logged in", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    delete (window as any).location;
    window.location = { href: "" } as any;

    render(<PricingSection />);
    const subscribeButtons = screen.getAllByText(/Assinar Agora/i);
    fireEvent.click(subscribeButtons[0]);

    expect(alertSpy).toHaveBeenCalledWith(
      "Por favor, faça login para continuar a compra."
    );
    expect(window.location.href).toContain("/login");
  });
});
