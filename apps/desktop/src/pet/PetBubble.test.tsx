import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { AFTER_HOVER_MS, LONG_MESSAGE, PetBubble, bubbleTime } from "./PetBubble";

function bubble(text: string, onOpen = vi.fn(), onDone = vi.fn()) {
  render(
    <I18nProvider initial="en">
      <PetBubble text={text} onOpen={onOpen} onDone={onDone} />
    </I18nProvider>,
  );
  return { onOpen, onDone, element: screen.getByRole("status") };
}

describe("PetBubble", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays long enough to read, and never for long", () => {
    expect(bubbleTime("Hi")).toBe(4_000);
    expect(bubbleTime("x".repeat(100))).toBe(8_500);
    expect(bubbleTime("x".repeat(1_000))).toBe(15_000);
  });

  it("shows the message as plain text and fades on its own", () => {
    const { onDone, element } = bubble("<b>Done</b>, the folder is tidy.");
    expect(element.textContent).toBe("<b>Done</b>, the folder is tidy.");
    expect(element.querySelector("b")).toBeNull();
    act(() => vi.advanceTimersByTime(bubbleTime("<b>Done</b>, the folder is tidy.") - 1));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("stays while the pointer is on it, and fades soon after it leaves", () => {
    const { onDone, element } = bubble("Hi");
    fireEvent.mouseEnter(element);
    act(() => vi.advanceTimersByTime(60_000));
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.mouseLeave(element);
    act(() => vi.advanceTimersByTime(AFTER_HOVER_MS));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("offers the window for a long message, and opens it on a click", () => {
    const { onOpen, element } = bubble("x".repeat(LONG_MESSAGE + 1));
    expect(screen.getByText(en.pet.openInWindow)).toBeTruthy();
    fireEvent.click(element);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("offers nothing more for a short message", () => {
    bubble("x".repeat(LONG_MESSAGE));
    expect(screen.queryByText(en.pet.openInWindow)).toBeNull();
  });
});
