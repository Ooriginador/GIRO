import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./page";
import * as api from "../../lib/api";
import { useRouter } from "next/navigation";

vi.mock("../../lib/api");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe("RegisterPage", () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: pushMock });
    global.localStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
    } as any;
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("should handle registration form submission", async () => {
    (api.register as any).mockResolvedValue({ token: "fake-token" });

    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText(/Nome Completo/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Seu melhor e-mail/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^Senha$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirme sua senha/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Criar Conta/i }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        phone: "",
        company_name: "",
      });
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });
});
