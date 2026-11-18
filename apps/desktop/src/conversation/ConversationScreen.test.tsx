import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "radix-ui";
import { useState, useSyncExternalStore } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { ConversationScreen } from "./ConversationScreen";
import { createFakeSource } from "./fake";
import { Header } from "./Header";
import type { View } from "./model";
import type { SessionSource } from "./source";

interface Options {
  id?: string;
  initialView?: View;
  source?: SessionSource;
  onOpenSession?: (id: string) => void;
}

/** A session with its header, as the main window shows them. */
function Session({ id = "hike", initialView = "full", source = createFakeSource("en"), onOpenSession = () => {} }: Options) {
  const [view, setView] = useState<View>(initialView);
  const conversation = useSyncExternalStore(source.subscribe, () => source.conversation(id));
  return (
    <I18nProvider initial="en">
      <Tooltip.Provider>
        {/* The header lives in the title bar, a <header> landmark, in the main window. */}
        <header>
          {conversation && (
            <Header
              source={source}
              conversation={conversation}
              view={view}
              onViewChange={setView}
              developerDetails={false}
              onDeveloperDetailsChange={() => {}}
              onOpenSession={onOpenSession}
            />
          )}
        </header>
        <ConversationScreen source={source} id={id} view={view} onOpen={() => {}} onOpenSession={onOpenSession} />
      </Tooltip.Provider>
    </I18nProvider>
  );
}

describe("ConversationScreen", () => {
  it("shows working text and tool calls in full view, and only messages and cards in chat view", async () => {
    const user = userEvent.setup();
    render(<Session />);
    expect(screen.getByText(/trip notes before suggesting/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Used 3 tools/ })).toBeTruthy();
    expect(screen.getByText(/Saturday looks great/)).toBeTruthy();

    await user.click(screen.getByRole("switch", { name: en.header.showWork }));
    expect(screen.queryByText(/trip notes before suggesting/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Used 3 tools/ })).toBeNull();
    expect(screen.getByText(/Saturday looks great/)).toBeTruthy();
    // Approvals and received tasks stay in chat view.
    expect(screen.getByRole("button", { name: en.approval.allowOnce })).toBeTruthy();
    expect(screen.getByRole("region", { name: en.received.title })).toBeTruthy();
  });

  it("names tools by their display names", async () => {
    const user = userEvent.setup();
    render(<Session />);
    await user.click(screen.getByRole("button", { name: /Used 3 tools/ }));
    expect(screen.getByText("Remote(desktop3).Files.Read(trips/hiking.md)")).toBeTruthy();
  });

  it("answers an approval in place", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const answer = vi.spyOn(source, "answer");
    render(<Session source={source} />);
    const card = screen.getByRole("region", { name: /wants to buy a bus ticket/ });
    // No button takes the default focus, so a stray Enter approves nothing.
    expect(card.contains(document.activeElement)).toBe(false);
    await user.click(within(card).getByRole("button", { name: en.approval.allowOnce }));
    expect(answer).toHaveBeenCalledWith("hike", "a1", "allowed");
    expect(within(card).getByText(en.approval.allowed)).toBeTruthy();
  });

  it("lists dispatched tasks with their sessions and status, and opens a task's session", async () => {
    const user = userEvent.setup();
    const onOpenSession = vi.fn();
    render(<Session id="errands" onOpenSession={onOpenSession} />);
    const card = screen.getByRole("region", { name: en.dispatch.title(8) });
    expect(within(card).getByText(/3 running · 1 waiting for approval · 1 waiting for a device · 3 done/)).toBeTruthy();
    expect(within(card).getAllByText(en.dispatch.kept)).toHaveLength(2);
    expect(within(card).getAllByText(en.dispatch.created)).toHaveLength(4);
    expect(within(card).getByText(en.dispatch.footer)).toBeTruthy();
    await user.click(within(card).getByRole("button", { name: en.dispatch.open("Sort the Downloads folder") }));
    expect(onOpenSession).toHaveBeenCalledWith("downloads");
  });

  it("shows a received task with a link back to the session it came from", async () => {
    const user = userEvent.setup();
    const onOpenSession = vi.fn();
    render(<Session id="downloads" onOpenSession={onOpenSession} />);
    const card = screen.getByRole("region", { name: en.received.title });
    expect(within(card).getByText(/Sort the Downloads folder by type/)).toBeTruthy();
    await user.click(within(card).getByRole("button", { name: en.received.from("Errands this week") }));
    expect(onOpenSession).toHaveBeenCalledWith("errands");
  });

  it("makes an archived session read-only, with Carry on in place of the composer", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const onOpenSession = vi.fn();
    render(<Session id="gift" source={source} onOpenSession={onOpenSession} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText(en.composer.archived)).toBeTruthy();
    expect(screen.getByText(en.blocks.archivedEnded)).toBeTruthy();
    // Archived sessions take no tasks and cannot be ended again.
    expect(screen.queryByRole("switch", { name: en.header.acceptTasks })).toBeNull();
    expect(screen.queryByRole("button", { name: en.header.endSession })).toBeNull();
    await user.click(screen.getAllByRole("button", { name: en.blocks.carryOn })[1]!);
    const carried = onOpenSession.mock.calls[0]![0] as string;
    expect(source.conversation(carried)?.title).toBe("Birthday gift ideas");
    expect(source.conversation(carried)?.archived).toBeFalsy();
  });
});

describe("Header", () => {
  it("marks the character as an AI next to its name, and says what kind of session it is", () => {
    render(<Session id="errands" />);
    expect(screen.getByLabelText(en.header.aiLabel).textContent).toBe("AI");
    expect(screen.getByRole("note", { name: en.header.sharedHint }).textContent).toBe(en.header.shared);
  });

  it("names a device session's device and the session a dispatched task came from", async () => {
    const user = userEvent.setup();
    const onOpenSession = vi.fn();
    render(<Session id="downloads" onOpenSession={onOpenSession} />);
    expect(screen.getByRole("note", { name: en.header.deviceHint("My laptop") }).textContent).toBe("My laptop");
    // Testing Library counts every <header> as a banner, the cards' too; the title bar comes first.
    const [titleBar] = screen.getAllByRole("banner");
    await user.click(within(titleBar!).getByRole("button", { name: en.header.from("Errands this week") }));
    expect(onOpenSession).toHaveBeenCalledWith("errands");
  });

  it("switches Accept tasks and ends the session at once", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    render(<Session id="presentation" source={source} />);
    const accept = screen.getByRole("switch", { name: en.header.acceptTasks });
    expect(accept.getAttribute("aria-checked")).toBe("false");
    await user.click(accept);
    expect(source.conversation("presentation")!.acceptsTasks).toBe(true);
    expect(screen.getByRole("switch", { name: en.header.acceptTasks }).getAttribute("aria-checked")).toBe("true");

    await user.click(screen.getByRole("button", { name: en.header.endSession }));
    expect(source.conversation("presentation")!.archived).toBe(true);
    expect(screen.getByText(en.composer.archived)).toBeTruthy();
  });
});

describe("Composer", () => {
  const box = () => screen.getByRole("textbox", { name: en.composer.placeholder("Dafeiyu") });

  it("sends with Enter and starts a new line with Shift+Enter", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const send = vi.spyOn(source, "send");
    render(<Session id="presentation" source={source} />);
    await user.type(box(), "First line{Shift>}{Enter}{/Shift}second line");
    expect(send).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(send).toHaveBeenCalledWith("presentation", "First line\nsecond line");
    expect((box() as HTMLTextAreaElement).value).toBe("");
  });

  it("does not send while an input method is composing", () => {
    const source = createFakeSource("en");
    const send = vi.spyOn(source, "send");
    render(<Session id="presentation" source={source} />);
    fireEvent.change(box(), { target: { value: "ni hao" } });
    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("offers Stop while the character works and the box is empty, and Esc stops too", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const stop = vi.spyOn(source, "stop");
    render(<Session id="downloads" source={source} />);
    expect(screen.getByRole("button", { name: en.composer.stop })).toBeTruthy();
    await user.type(box(), "Cancel that");
    expect(screen.getByRole("button", { name: en.composer.send })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(stop).toHaveBeenCalledWith("downloads");
  });
});
