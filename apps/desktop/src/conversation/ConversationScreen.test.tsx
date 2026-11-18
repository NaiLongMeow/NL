import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "radix-ui";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { ConversationScreen } from "./ConversationScreen";
import { createFakeSource } from "./fake";
import type { View } from "./model";

function Screen({ id = "hike", initialView = "full" as View, source = createFakeSource("en") }) {
  const [view, setView] = useState<View>(initialView);
  return (
    <I18nProvider initial="en">
      <Tooltip.Provider>
        <ConversationScreen
          source={source}
          id={id}
          view={view}
          onViewChange={setView}
          developerDetails={false}
          onDeveloperDetailsChange={() => {}}
          onOpen={() => {}}
        />
      </Tooltip.Provider>
    </I18nProvider>
  );
}

describe("ConversationScreen", () => {
  it("shows working text and tool calls in full view, and only messages in chat view", async () => {
    const user = userEvent.setup();
    render(<Screen />);
    expect(screen.getByText(/trip notes before suggesting/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Used 3 tools/ })).toBeTruthy();
    expect(screen.getByText(/Saturday looks great/)).toBeTruthy();

    await user.click(screen.getByRole("switch", { name: en.header.showWork }));
    expect(screen.queryByText(/trip notes before suggesting/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Used 3 tools/ })).toBeNull();
    expect(screen.getByText(/Saturday looks great/)).toBeTruthy();
    // Approvals stay in chat view: the turn waits for them.
    expect(screen.getByRole("button", { name: en.approval.allowOnce })).toBeTruthy();
  });

  it("names tools by their display names", () => {
    render(<Screen />);
    expect(screen.getByText("Remote(phone).Messages.Send(Mia)")).toBeTruthy();
  });

  it("marks the character as an AI next to its name", () => {
    render(<Screen />);
    expect(screen.getByLabelText(en.header.aiLabel).textContent).toBe("AI");
  });

  it("answers an approval in place", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const answer = vi.spyOn(source, "answer");
    render(<Screen source={source} />);
    const card = screen.getByRole("region", { name: /wants to buy a bus ticket/ });
    // No button takes the default focus, so a stray Enter approves nothing.
    expect(card.contains(document.activeElement)).toBe(false);
    await user.click(within(card).getByRole("button", { name: en.approval.allowOnce }));
    expect(answer).toHaveBeenCalledWith("hike", "a1", "allowed");
    expect(within(card).getByText(en.approval.allowed)).toBeTruthy();
  });
});

describe("Composer", () => {
  const box = () => screen.getByRole("textbox", { name: en.composer.placeholder("Dafeiyu") });

  it("sends with Enter and starts a new line with Shift+Enter", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const send = vi.spyOn(source, "send");
    render(<Screen id="chat" source={source} />);
    await user.type(box(), "First line{Shift>}{Enter}{/Shift}second line");
    expect(send).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(send).toHaveBeenCalledWith("chat", "First line\nsecond line");
    expect((box() as HTMLTextAreaElement).value).toBe("");
  });

  it("does not send while an input method is composing", () => {
    const source = createFakeSource("en");
    const send = vi.spyOn(source, "send");
    render(<Screen id="chat" source={source} />);
    fireEvent.change(box(), { target: { value: "ni hao" } });
    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("offers Stop while the character works and the box is empty, and Esc stops too", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const stop = vi.spyOn(source, "stop");
    render(<Screen source={source} />);
    expect(screen.getByRole("button", { name: en.composer.stop })).toBeTruthy();
    await user.type(box(), "Cancel that");
    expect(screen.getByRole("button", { name: en.composer.send })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(stop).toHaveBeenCalledWith("hike");
  });
});
