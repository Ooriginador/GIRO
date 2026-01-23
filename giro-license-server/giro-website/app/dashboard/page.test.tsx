import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./page";
import * as api from "../../lib/api";
import { useRouter } from "next/navigation";

vi.mock("../../lib/api");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

describe("DashboardPage", () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: pushMock,
      replace: pushMock,
    });
  });

  it("should render loading state then data", async () => {
    (api.getProfile as any).mockResolvedValue({
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      created_at: "2024-01-01",
    });
    (api.getLicenses as any).mockResolvedValue({
      data: [
        {
          id: "1",
          license_key: "ABC-123",
          plan_type: "annual",
          status: "active",
          expires_at: "2025-01-01",
        },
      ],
      pagination: {},
    });
    (api.getHardware as any).mockResolvedValue([
      {
        id: "1",
        fingerprint: "xyz-123",
        machine_name: "Main PC",
        os_version: "Linux",
        last_seen: "2024-01-01",
      },
    ]);

    render(<DashboardPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Olá, John/i)).toBeInTheDocument();
    });
  });

  it("should render empty state if no licenses", async () => {
    (api.getProfile as any).mockResolvedValue({
      id: "1",
      name: "John Doe",
      email: "john@example.com",
    });
    (api.getLicenses as any).mockResolvedValue({ data: [], pagination: {} });
    (api.getHardware as any).mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhuma licença encontrada/i)
      ).toBeInTheDocument();
    });
  });
});
