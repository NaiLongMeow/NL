import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createFakeSource } from "../conversation/fake";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { Sidebar } from "./Sidebar";

function renderSidebar(source = createFakeSource("en"), onSelect = vi.fn(), onScreen = vi.fn()) {
  render(
    <I18nProvider initial="en">
      <Sidebar source={source} selected="errands" screen="session" onSelect={onSelect} onScreen={onScreen} />
    </I18nProvider>,
  );
  return { onSelect, onScreen };
}

describe("Sidebar", () => {
  it("lists shared sessions, then device sessions under each device, this one first", () => {
    renderSidebar();
    const shared = screen.getByRole("region", { name: en.sidebar.shared });
    expect(within(shared).getAllByRole("button").map((button) => button.textContent)).toEqual([
      expect.stringContaining("Errands this week"),
      expect.stringContaining("Last month's bills"),
    ]);
    const devices = screen.getByRole("region", { name: en.sidebar.devices });
    const headings = within(devices).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual([`My laptop${en.sidebar.thisDevice}`, "Study desktop", "Home server", `Phone${en.sidebar.offline}`]);
  });

  it("gives each session one status line, with the archive countdown when idle and where a task came from", () => {
    renderSidebar();
    const row = (title: string) => screen.getByRole("button", { name: new RegExp(`^${title}`) });
    expect(row("Errands this week").textContent).toContain(en.sidebar.idle(26));
    expect(row("Weekend hike").textContent).toContain(en.sidebar.approval);
    expect(row("Sorting photos").textContent).toContain(en.sidebar.question);
    expect(row("Message Mia").textContent).toContain(en.sidebar.waitingForDevice);
    expect(row("Sort the Downloads folder").textContent).toContain("Moving files…");
    expect(row("Sort the Downloads folder").textContent).toContain(en.sidebar.from("Errands this week"));
    expect(row("Errands this week").getAttribute("aria-current")).toBe("page");
  });

  it("filters the live sessions by title", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.type(screen.getByRole("searchbox", { name: en.sidebar.search }), "photo");
    expect(screen.queryByRole("region", { name: en.sidebar.shared })).toBeNull();
    expect(screen.getByRole("button", { name: /^Sorting photos/ })).toBeTruthy();
    await user.type(screen.getByRole("searchbox", { name: en.sidebar.search }), "zzz");
    expect(screen.getByText(en.sidebar.noMatch)).toBeTruthy();
  });

  it("opens a session, the archive with its count, and the other screens", async () => {
    const user = userEvent.setup();
    const { onSelect, onScreen } = renderSidebar();
    await user.click(screen.getByRole("button", { name: /^Weekend hike/ }));
    expect(onSelect).toHaveBeenCalledWith("hike");
    const archive = screen.getByRole("button", { name: new RegExp(`^${en.sidebar.archive}`) });
    expect(archive.textContent).toBe(`${en.sidebar.archive}5`);
    await user.click(archive);
    await user.click(screen.getByRole("button", { name: en.sidebar.settings }));
    expect(onScreen.mock.calls).toEqual([["archive"], ["settings"]]);
  });

  it("drops a session that was ended from the live list", () => {
    const source = createFakeSource("en");
    source.end("presentation");
    renderSidebar(source);
    expect(screen.queryByRole("button", { name: /^Presentation day/ })).toBeNull();
    expect(screen.getByRole("button", { name: new RegExp(`^${en.sidebar.archive}`) }).textContent).toBe(`${en.sidebar.archive}6`);
  });
});
