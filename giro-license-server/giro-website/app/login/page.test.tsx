import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import * as api from "../../lib/api";
import { useRouter } from "next/navigation";

vi.mock("../../lib/api");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

describe("LoginPage", () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: pushMock });
    global.localStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
    } as any;
  });

  it("should handle login form submission", async () => {
    (api.login as any).mockResolvedValue({ token: "fake-token" });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/Seu e-mail/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Sua senha/i), {
      target: { value: "password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password",
      });
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        "token",
        "fake-token"
      );
    });
  });
});
