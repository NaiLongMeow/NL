import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_APPEARANCE, THEME_NAMES, type Appearance } from "../app/appearance";
import type { CustomThemes } from "../app/native";
import { I18nProvider, LOCALE_KEY } from "../i18n/I18n";
import { en, zhCN } from "../i18n/messages";
import { SettingsScreen } from "./SettingsScreen";

function Settings({ custom = null as CustomThemes | null, onIdleLimit = vi.fn(), onAppearance = vi.fn() }) {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  return (
    <I18nProvider initial="en">
      <SettingsScreen
        appearance={appearance}
        mode="dark"
        onAppearance={(next) => {
          onAppearance(next);
          setAppearance(next);
        }}
        custom={custom}
        onReloadCustom={() => {}}
        onOpenCustomFolder={() => {}}
        idleLimit={30}
        onIdleLimit={onIdleLimit}
      />
    </I18nProvider>
  );
}

describe("SettingsScreen", () => {
  it("previews every built-in theme in the mode in use and picks one", async () => {
    const user = userEvent.setup();
    const onAppearance = vi.fn();
    render(<Settings onAppearance={onAppearance} />);
    const group = screen.getByRole("radiogroup", { name: en.settings.theme });
    const cards = within(group).getAllByRole("radio");
    expect(cards.map((card) => card.dataset.theme)).toEqual(THEME_NAMES);
    expect(cards.every((card) => card.dataset.mode === "dark")).toBe(true);
    expect(within(group).getByRole("radio", { name: en.settings.themes.sea }).getAttribute("aria-checked")).toBe("true");
    await user.click(within(group).getByRole("radio", { name: en.settings.themes.matcha }));
    expect(onAppearance).toHaveBeenLastCalledWith({ ...DEFAULT_APPEARANCE, theme: "matcha" });
    expect(within(group).getByRole("radio", { name: en.settings.themes.matcha }).getAttribute("aria-checked")).toBe("true");
  });

  it("chooses light, dark, or the system's mode", async () => {
    const user = userEvent.setup();
    const onAppearance = vi.fn();
    render(<Settings onAppearance={onAppearance} />);
    const modes = screen.getByRole("radiogroup", { name: en.settings.mode });
    await user.click(within(modes).getByRole("radio", { name: en.settings.modes.dark }));
    expect(onAppearance).toHaveBeenLastCalledWith({ ...DEFAULT_APPEARANCE, mode: "dark" });
  });

  it("lists custom themes, refuses broken files, and applies one on top", async () => {
    const user = userEvent.setup();
    const onAppearance = vi.fn();
    render(
      <Settings
        onAppearance={onAppearance}
        custom={{
          folder: "C:\\Users\\someone\\AppData\\Roaming\\dev.nailongmeow.nl\\themes",
          themes: [
            { file: "big.css", name: "big", css: null, problem: "too-large" },
            { file: "ocean.css", name: "ocean", css: ":root {}", problem: null },
          ],
        }}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: en.settings.custom });
    expect(within(group).getByRole("radio", { name: en.settings.customNone })).toHaveProperty("checked", true);
    expect(within(group).getByRole("radio", { name: /big/ })).toHaveProperty("disabled", true);
    expect(within(group).getByText(en.settings.customProblem["too-large"])).toBeTruthy();
    await user.click(within(group).getByRole("radio", { name: /ocean/ }));
    expect(onAppearance).toHaveBeenLastCalledWith({ ...DEFAULT_APPEARANCE, custom: "ocean.css" });
    expect(screen.getByText(/dev\.nailongmeow\.nl\\themes$/)).toBeTruthy();
  });

  it("says custom themes need the desktop app outside it", () => {
    render(<Settings />);
    expect(screen.getByText(en.settings.customDesktopOnly)).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.settings.customFolder })).toBeNull();
  });

  it("switches the interface language and remembers it on this device", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(within(screen.getByRole("radiogroup", { name: en.settings.language })).getByRole("radio", { name: "简体中文" }));
    expect(screen.getByRole("heading", { name: zhCN.settings.appearance })).toBeTruthy();
    expect(localStorage.getItem(LOCALE_KEY)).toBe("zh-CN");
    localStorage.removeItem(LOCALE_KEY);
  });

  it("sets how long an idle session waits before it archives itself", async () => {
    const user = userEvent.setup();
    const onIdleLimit = vi.fn();
    render(<Settings onIdleLimit={onIdleLimit} />);
    const limits = screen.getByRole("radiogroup", { name: en.settings.idleLimit });
    expect(within(limits).getAllByRole("radio").map((option) => option.textContent)).toEqual(["10 min", "30 min", "1 hour", "2 hours"]);
    await user.click(within(limits).getByRole("radio", { name: "1 hour" }));
    expect(onIdleLimit).toHaveBeenCalledWith(60);
  });
});
