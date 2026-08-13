/**
 * MCItemRenderer.test.tsx
 *
 * Tests for the multiple-choice item renderer used in the v1.7 Skill Assessment.
 *
 * Key contract assertions:
 *  - Continue button stays disabled until BOTH an option and a confidence are chosen
 *  - Each confidence pill sends the exact API value (underscore, not hyphen)
 *  - "Fairly sure" pill sends "fairly_sure" — the API rejects "fairly-sure"
 *  - A/B/C/D keyboard shortcuts select the corresponding option
 *  - State resets when item.id changes (no stale answer carried across items)
 *
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { MCItemRenderer, type MCItem, type ConfidenceLevel } from "@/components/homebase/MCItemRenderer";

// ── Fixture ───────────────────────────────────────────────────────────────────

const ITEM: MCItem = {
  id:          1,
  domain:      "config-setup",
  domainLabel: "Configuration and Setup",
  itemType:    "mc",
  question:    "Which menu lets you create a custom object?",
  options:     [
    "Setup > Object Manager",
    "App Launcher > New Object",
    "Reports > Custom Objects",
    "Profiles > Object Settings",
  ],
  weight: 1,
};

const ITEM_2: MCItem = { ...ITEM, id: 2, question: "Second question?" };

// ── Helpers ───────────────────────────────────────────────────────────────────

type SubmitFn = (answer: string, confidence: ConfidenceLevel) => Promise<void>;

function makeMock(): SubmitFn {
  const m = vi.fn();
  m.mockResolvedValue(undefined);
  return m as unknown as SubmitFn;
}

function renderMC(
  onSubmit: SubmitFn = makeMock(),
  submitting = false,
  item: MCItem = ITEM,
) {
  return render(
    <MCItemRenderer item={item} onSubmit={onSubmit} submitting={submitting} />,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MCItemRenderer", () => {

  it("renders the question stem", () => {
    renderMC();
    expect(screen.getByText(ITEM.question)).toBeInTheDocument();
  });

  it("renders all four option cards with A/B/C/D labels", () => {
    renderMC();
    ["A", "B", "C", "D"].forEach(letter => {
      expect(screen.getByText(letter)).toBeInTheDocument();
    });
    ITEM.options!.forEach(opt => {
      expect(screen.getByText(opt)).toBeInTheDocument();
    });
  });

  it("Continue button is disabled when nothing is selected", () => {
    renderMC();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("Continue button is disabled when only an option is selected (no confidence)", () => {
    renderMC();
    fireEvent.click(screen.getByText("Setup > Object Manager"));
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("Continue button is disabled when only confidence is chosen (no option)", () => {
    renderMC();
    fireEvent.click(screen.getByText("Confident"));
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("Continue button enables when both option and confidence are chosen", () => {
    renderMC();
    fireEvent.click(screen.getByText("Setup > Object Manager"));
    fireEvent.click(screen.getByText("Confident"));
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("submits the selected option text and confidence value on Continue", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderMC(onSubmit);
    fireEvent.click(screen.getByText("Setup > Object Manager"));
    fireEvent.click(screen.getByText("Confident"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("Setup > Object Manager", "confident");
    });
  });

  // ── Confidence API value contract ─────────────────────────────────────────

  it("sends 'confident' (exact) for the Confident pill", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderMC(onSubmit);
    fireEvent.click(screen.getByText(ITEM.options![0]));
    fireEvent.click(screen.getByText("Confident"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][1]).toBe("confident");
  });

  it("sends 'fairly_sure' (underscore) for the Fairly sure pill — never 'fairly-sure'", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderMC(onSubmit);
    fireEvent.click(screen.getByText(ITEM.options![0]));
    fireEvent.click(screen.getByText("Fairly sure"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const sentConfidence: string = onSubmit.mock.calls[0][1] as string;
    expect(sentConfidence).toBe("fairly_sure");
    expect(sentConfidence).not.toContain("-"); // hyphened value is rejected by the API
  });

  it("sends 'guessing' (exact) for the Guessing pill", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderMC(onSubmit);
    fireEvent.click(screen.getByText(ITEM.options![0]));
    fireEvent.click(screen.getByText("Guessing"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][1]).toBe("guessing");
  });

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  it("pressing 'a' selects the first option", () => {
    renderMC();
    fireEvent.keyDown(document, { key: "a" });
    const firstOpt = screen.getByText(ITEM.options![0]).closest("button");
    expect(firstOpt).toHaveAttribute("aria-pressed", "true");
  });

  it("pressing 'B' (uppercase) selects the second option", () => {
    renderMC();
    fireEvent.keyDown(document, { key: "B" });
    const secondOpt = screen.getByText(ITEM.options![1]).closest("button");
    expect(secondOpt).toHaveAttribute("aria-pressed", "true");
  });

  it("pressing 'd' selects the fourth option", () => {
    renderMC();
    fireEvent.keyDown(document, { key: "d" });
    const fourthOpt = screen.getByText(ITEM.options![3]).closest("button");
    expect(fourthOpt).toHaveAttribute("aria-pressed", "true");
  });

  // ── State reset on item change ────────────────────────────────────────────

  it("clears selection and confidence when item.id changes", () => {
    const { rerender } = renderMC(vi.fn(), false, ITEM);
    fireEvent.click(screen.getByText(ITEM.options![0]));
    fireEvent.click(screen.getByText("Confident"));
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();

    rerender(
      <MCItemRenderer item={ITEM_2} onSubmit={vi.fn()} submitting={false} />,
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  // ── Submitting state ──────────────────────────────────────────────────────

  it("disables all option buttons while submitting", () => {
    renderMC(vi.fn(), true /* submitting */);
    ITEM.options!.forEach(opt => {
      const btn = screen.getByText(opt).closest("button");
      expect(btn).toBeDisabled();
    });
  });

  it("shows 'Saving…' text while submitting", () => {
    renderMC(vi.fn(), true);
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

});
