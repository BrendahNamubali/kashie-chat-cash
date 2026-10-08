import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "@/components/ProtectedRoute";
import Settings from "@/pages/Settings";

const mocks = vi.hoisted(() => ({
  user: { id: "" }, getProfile: vi.fn(), updateProfile: vi.fn(), setCurrency: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/lib/finance", () => ({ getProfile: mocks.getProfile, updateProfile: mocks.updateProfile }));
vi.mock("@/lib/currency", () => ({ setCurrency: mocks.setCurrency, getCurrency: () => "UGX" }));
vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/CurrencySelect", () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <input aria-label="Currency" value={value} onChange={(event) => onChange(event.target.value)} />,
  isValidCurrency: (value: string) => /^[A-Z]{3}$/.test(value),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: crypto.randomUUID() };
  mocks.getProfile.mockResolvedValue({ onboarding_completed: true, currency: null });
  mocks.updateProfile.mockResolvedValue({ error: null });
});
afterEach(cleanup);

function showReminder() {
  return render(<MemoryRouter><ProtectedRoute><p>Business home</p></ProtectedRoute></MemoryRouter>);
}

describe("Currency setup reminder", () => {
  it.each(["Skip for now", "Close"])("%s dismisses without saving or affecting the signed-in page", async (label) => {
    const view = showReminder();
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Save currency" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Business home")).toBeInTheDocument();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(mocks.setCurrency).toHaveBeenCalledWith(null);
    view.unmount();
    showReminder();
    await screen.findByText("Business home");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never prompts for a saved currency", async () => {
    mocks.getProfile.mockResolvedValue({ onboarding_completed: true, currency: "KES" });
    showReminder();
    await screen.findByText("Business home");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.setCurrency).toHaveBeenCalledWith("KES");
  });

  it("keeps first-time users in required onboarding", async () => {
    mocks.getProfile.mockResolvedValue({ onboarding_completed: false, currency: null });
    render(<MemoryRouter initialEntries={["/home"]}><Routes>
      <Route path="/home" element={<ProtectedRoute>Business home</ProtectedRoute>} />
      <Route path="/onboarding" element={<p>Required business setup</p>} />
    </Routes></MemoryRouter>);
    await screen.findByText("Required business setup");
    expect(screen.queryByText("Business home")).not.toBeInTheDocument();
  });

  it("Settings offers an explicit choice when saved currency is unset", async () => {
    render(<Settings />);
    await screen.findByText("Your business currency is not set yet.");
    expect(screen.getByLabelText("Currency")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save currency" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "UGX" } });
    expect(screen.getByRole("button", { name: "Save currency" })).toBeEnabled();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });
});