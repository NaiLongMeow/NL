import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { PLAY_MS, PetWindow } from "./PetWindow";

describe("PetWindow", () => {
  it("shows the ball outside the desktop app, where there are no avatars", async () => {
    const { container } = render(
      <I18nProvider initial="en">
        <PetWindow />
      </I18nProvider>,
    );
    const pet = await screen.findByTitle(en.pet.hint);
    expect(pet.dataset.look).toBe("ball");
    expect(container.querySelector("[data-cue='idle'] svg")).toBeTruthy();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays when double-clicked, once at a time, and then stops: a double click never closes anything", async () => {
    const { container } = render(
      <I18nProvider initial="en">
        <PetWindow />
      </I18nProvider>,
    );
    const pet = await screen.findByTitle(en.pet.hint);
    vi.useFakeTimers();
    const ball = () => container.querySelector("[data-cue]")!;
    expect(ball().hasAttribute("data-play")).toBe(false);
    fireEvent.doubleClick(pet);
    expect(ball().getAttribute("data-play")).toBe("joy");
    act(() => vi.advanceTimersByTime(PLAY_MS / 2));
    fireEvent.doubleClick(pet);
    act(() => vi.advanceTimersByTime(PLAY_MS / 2));
    expect(ball().hasAttribute("data-play")).toBe(false);
    expect(pet.isConnected).toBe(true);
  });

  it("keeps the webview's own menu away from a right click, which opens the pet's menu in the app", async () => {
    render(
      <I18nProvider initial="en">
        <PetWindow />
      </I18nProvider>,
    );
    const pet = await screen.findByTitle(en.pet.hint);
    expect(fireEvent.contextMenu(pet)).toBe(false);
  });
});
