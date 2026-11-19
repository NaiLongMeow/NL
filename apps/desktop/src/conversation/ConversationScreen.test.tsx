import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "radix-ui";
import { useState, useSyncExternalStore } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { QuestionCard } from "./Cards";
import { ConversationScreen } from "./ConversationScreen";
import { createFakeSource } from "./fake";
import { Header } from "./Header";
import { sessionMenu } from "./sessionMenu";
import type { View } from "./model";
import type { SessionSource } from "./source";

interface Options {
  id?: string;
  initialView?: View;
  source?: SessionSource;
  onOpenSession?: (id: string) => void;
}

/** A session with its header, as the main window shows them. */
function Session({ id = "hike", initialView = "full", source: given, onOpenSession = () => {} }: Options) {
  // One source for the whole test: a default parameter would make a new one on every render.
  const [source] = useState(() => given ?? createFakeSource("en"));
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
              menu={sessionMenu(source, en, id, { open: onOpenSession, settings: () => {} })}
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
    expect(
      within(card).getByText(/2 running · 1 waiting for your answer · 1 waiting for approval · 1 waiting for a device · 3 done/),
    ).toBeTruthy();
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

  it("asks a question in place: nothing picked at first, then the picked option is the answer", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const answerQuestion = vi.spyOn(source, "answerQuestion");
    render(<Session id="photos" source={source} />);
    const card = screen.getByRole("region", { name: en.question.title("Dafeiyu") });
    expect(within(card).getByText(/212 photos have no date/)).toBeTruthy();
    const answer = within(card).getByRole("button", { name: en.question.answer });
    expect(answer).toHaveProperty("disabled", true);
    expect(card.contains(document.activeElement)).toBe(false);
    await user.click(within(card).getByRole("radio", { name: /Into a folder named Undated/ }));
    await user.click(answer);
    expect(answerQuestion).toHaveBeenCalledWith("photos", "q1", { choices: ["Into a folder named Undated"] });
    expect(within(card).getByText(en.question.answered("Into a folder named Undated"))).toBeTruthy();
    expect(within(card).queryByRole("radio")).toBeNull();
  });

  it("takes the user's own words under Something else, and can skip", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const answerQuestion = vi.spyOn(source, "answerQuestion");
    render(<Session id="photos" source={source} />);
    const card = screen.getByRole("region", { name: en.question.title("Dafeiyu") });
    await user.click(within(card).getByRole("radio", { name: en.question.other }));
    await user.type(within(card).getByRole("textbox", { name: en.question.otherPlaceholder }), "Ask me later{Enter}");
    expect(answerQuestion).toHaveBeenLastCalledWith("photos", "q1", { choices: [], other: "Ask me later" });

    const again = createFakeSource("en");
    const skip = vi.spyOn(again, "answerQuestion");
    render(<Session id="photos" source={again} />);
    const [, second] = screen.getAllByRole("region", { name: en.question.title("Dafeiyu") });
    await user.click(within(second!).getByRole("button", { name: en.question.skip }));
    expect(skip).toHaveBeenCalledWith("photos", "q1", { skipped: true });
    expect(within(second!).getByText(en.question.skipped)).toBeTruthy();
  });

  it("answers a waiting question with what the user types in the composer, and keeps it in chat view", async () => {
    const user = userEvent.setup();
    render(<Session id="photos" initialView="chat" />);
    const card = screen.getByRole("region", { name: en.question.title("Dafeiyu") });
    await user.type(screen.getByRole("textbox", { name: en.composer.answerPlaceholder("Dafeiyu") }), "Undated, please{Enter}");
    expect(within(card).getByText(en.question.answered("Undated, please"))).toBeTruthy();
    expect(screen.getByRole("textbox", { name: en.composer.placeholder("Dafeiyu") })).toBeTruthy();
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

describe("QuestionCard", () => {
  it("lets the user pick several options and add their own words when the question allows it", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(
      <I18nProvider initial="en">
        <QuestionCard
          character="Dafeiyu"
          question={{ id: "q", text: "Which snacks?", multiple: true, options: [{ label: "Crisps" }, { label: "Fruit" }, { label: "Nuts" }] }}
          onAnswer={onAnswer}
        />
      </I18nProvider>,
    );
    expect(screen.getByText(en.question.pickAny)).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Fruit" }));
    await user.click(screen.getByRole("checkbox", { name: "Crisps" }));
    await user.click(screen.getByRole("checkbox", { name: "Fruit" }));
    await user.click(screen.getByRole("checkbox", { name: "Nuts" }));
    await user.click(screen.getByRole("checkbox", { name: en.question.other }));
    await user.type(screen.getByRole("textbox", { name: en.question.otherPlaceholder }), "Tea");
    await user.click(screen.getByRole("button", { name: en.question.answer }));
    expect(onAnswer).toHaveBeenCalledWith({ choices: ["Crisps", "Nuts"], other: "Tea" });
  });
});

describe("Header", () => {
  it("shows on the avatar what the session waits for, or that it works or rests", () => {
    const states: Record<string, string> = { hike: "approval", photos: "question", mia: "device", downloads: "working", errands: "idle" };
    for (const [id, cue] of Object.entries(states)) {
      const { container, unmount } = render(<Session id={id} />);
      expect(container.querySelector("header [data-cue]")?.getAttribute("data-cue"), id).toBe(cue);
      unmount();
    }
  });

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

describe("menus on blocks (note, sections 4.15 and 4.16)", () => {
  const box = () => screen.getByRole("textbox", { name: en.composer.placeholder("Dafeiyu") });
  const menuOf = async (element: HTMLElement) => {
    fireEvent.contextMenu(element);
    return screen.findByRole("menu");
  };
  const items = (menu: HTMLElement) => within(menu).getAllByRole("menuitem").map((item) => item.textContent);
  // The last message is also in the live region for screen readers; the bubble comes first.
  const bubble = (text: string | RegExp) => screen.getAllByText(text)[0]!;

  it("copies a block's text, or only the part of it the user selected", async () => {
    const user = userEvent.setup();
    render(<Session id="presentation" />);
    const bubble = screen.getByText("So the preparation paid off. Want to treat yourself tonight?");
    const menu = await menuOf(bubble);
    expect(items(menu)).toEqual([en.menu.copy, en.menu.quote, en.menu.rewind]);
    await user.click(within(menu).getByRole("menuitem", { name: en.menu.copy }));
    expect(await navigator.clipboard.readText()).toBe("So the preparation paid off. Want to treat yourself tonight?");

    const range = document.createRange();
    range.setStart(bubble.firstChild!, 3);
    range.setEnd(bubble.firstChild!, 18);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    await user.click(within(await menuOf(bubble)).getByRole("menuitem", { name: en.menu.copy }));
    expect(await navigator.clipboard.readText()).toBe("the preparation");
  });

  it("quotes a block above the composer and sends the quote with the next message", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const send = vi.spyOn(source, "send");
    render(<Session id="presentation" source={source} />);
    const menu = await menuOf(bubble("Maybe the ramen place you mentioned last week?"));
    await user.click(within(menu).getByRole("menuitem", { name: en.menu.quote }));
    expect(screen.getByText(en.composer.quoting("Dafeiyu"))).toBeTruthy();
    expect(document.activeElement).toBe(box());
    await user.keyboard("Yes!{Enter}");
    const quote = { from: "character", text: "Maybe the ramen place you mentioned last week?" };
    expect(send).toHaveBeenCalledWith("presentation", "Yes!", quote);
    expect(screen.queryByText(en.composer.quoting("Dafeiyu"))).toBeNull();
    // The bubble shows what it quoted, above its text.
    const sent = screen.getByText("Yes!");
    expect(sent.textContent).toContain("Maybe the ramen place");

    await user.click(within(await menuOf(screen.getByText("The one about the budget. But I had the numbers ready."))).getByRole("menuitem", { name: en.menu.quote }));
    expect(screen.getByText(en.composer.quoting(en.blocks.you))).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en.composer.removeQuote }));
    expect(screen.queryByText(en.composer.quoting(en.blocks.you))).toBeNull();
  });

  it("edits the user's message in place, and keeps the earlier version to show again", async () => {
    const user = userEvent.setup();
    const source = createFakeSource("en");
    const edit = vi.spyOn(source, "edit");
    render(<Session id="presentation" source={source} />);
    const original = "Tired but relieved. The Q&A went better than I expected.";
    const menu = await menuOf(screen.getByText(original));
    expect(items(menu)).toEqual([en.menu.copy, en.menu.quote, en.menu.edit, en.menu.rewind]);
    await user.click(within(menu).getByRole("menuitem", { name: en.menu.edit }));
    const editor = screen.getByRole("textbox", { name: en.menu.edit });
    expect((editor as HTMLTextAreaElement).value).toBe(original);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: en.menu.edit })).toBeNull();
    expect(edit).not.toHaveBeenCalled();

    await user.click(within(await menuOf(screen.getByText(original))).getByRole("menuitem", { name: en.menu.edit }));
    await user.clear(screen.getByRole("textbox", { name: en.menu.edit }));
    await user.keyboard("Mostly relieved.{Enter}");
    expect(edit).toHaveBeenCalledWith("presentation", "c3", "Mostly relieved.");
    expect(screen.queryByText(original)).toBeNull();
    expect(screen.getByText("Mostly relieved.")).toBeTruthy();
    const versions = screen.getByRole("group", { name: en.blocks.versions(2, 2) });
    await user.click(within(versions).getByRole("button", { name: en.blocks.previousVersion }));
    expect(screen.getByText(original)).toBeTruthy();
    expect(screen.getByRole("group", { name: en.blocks.versions(1, 2) })).toBeTruthy();
  });

  it("rewinds to before a tool call's step, then restores what came after", async () => {
    const user = userEvent.setup();
    render(<Session />);
    const menu = await menuOf(screen.getByRole("button", { name: /Used 3 tools/ }));
    expect(items(menu)).toEqual([en.menu.copy, en.menu.rewind]);
    await user.click(within(menu).getByRole("menuitem", { name: en.menu.rewind }));
    expect(screen.queryByText(/Saturday looks great/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Used 3 tools/ })).toBeNull();
    expect(screen.getByText(en.blocks.rewound)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en.blocks.restore }));
    expect(screen.getByText(/Saturday looks great/)).toBeTruthy();
    expect(screen.queryByText(en.blocks.rewound)).toBeNull();
  });

  it("offers only Copy in an archived session", async () => {
    render(<Session id="gift" />);
    const menu = await menuOf(bubble(/A birthday gift for Mom/));
    expect(items(menu)).toEqual([en.menu.copy]);
  });

  it("puts the session's actions in the header's menu, with export and developer details", async () => {
    const user = userEvent.setup();
    render(<Session id="presentation" />);
    await user.click(screen.getByRole("button", { name: en.header.more }));
    const menu = await screen.findByRole("menu");
    expect(items(menu)).toEqual([en.menu.branch, en.menu.carryOn, en.menu.summarize, en.menu.settings, en.menu.archive, en.header.exportJsonl]);
    expect(within(menu).getByRole("menuitemcheckbox", { name: en.header.developerDetails })).toBeTruthy();
  });
});
