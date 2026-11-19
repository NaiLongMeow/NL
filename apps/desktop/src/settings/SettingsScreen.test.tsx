import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_APPEARANCE, THEME_NAMES, type Appearance } from "../app/appearance";
import type { CustomThemes } from "../app/native";
import type { AvatarEntry, AvatarList } from "../avatars/avatars";
import { I18nProvider, LOCALE_KEY } from "../i18n/I18n";
import { en, zhCN } from "../i18n/messages";
import { DEFAULT_PET, type PetPrefs } from "../pet/look";
import { SKILL_COMMAND, SettingsScreen } from "./SettingsScreen";

function Settings({
  custom = null as CustomThemes | null,
  onIdleLimit = vi.fn(),
  onAppearance = vi.fn(),
  avatars = null as AvatarList | null,
  onPet = vi.fn(),
  initialPet = DEFAULT_PET,
  onNotifyMessages = vi.fn(),
}) {
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [pet, setPet] = useState<PetPrefs>(initialPet);
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
        notifyMessages={notifyMessages}
        onNotifyMessages={(on) => {
          onNotifyMessages(on);
          setNotifyMessages(on);
        }}
        pet={pet}
        onPet={(next) => {
          onPet(next);
          setPet(next);
        }}
        avatars={avatars}
        onReloadAvatars={() => {}}
        onOpenAvatarsFolder={() => {}}
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

/** A listed pack whose manifest is `manifest`, with the files it names. */
function entry(key: string, manifest: object | string, files: string[], extra: Partial<AvatarEntry> = {}): AvatarEntry {
  return {
    key,
    manifest: typeof manifest === "string" ? manifest : JSON.stringify(manifest),
    files: ["avatar.json", ...files],
    skipped: [],
    problem: null,
    development: false,
    ...extra,
  };
}

const lightOnly = entry("mochi", {
  nlAvatar: 1,
  id: "mochi",
  name: { en: "Mochi", "zh-CN": "麻糬" },
  author: "Jane",
  license: "CC BY 4.0",
  light: { size: [64, 64], animations: { idle: { image: "idle.gif" } }, states: { idle: "idle" } },
}, ["idle.gif"]);

const both = entry(
  "whale",
  {
    nlAvatar: 1,
    id: "whale",
    name: "Whale",
    light: { size: [64, 64], animations: { idle: { image: "idle.png" } }, states: { idle: "idle" } },
    live2d: { model: "m/whale.model3.json" },
  },
  ["idle.png", "m/whale.model3.json"],
  { development: true },
);

const broken = entry("broken", { nlAvatar: 1, id: "broken", name: "Broken", light: { size: [64, 64], animations: {}, states: {} } }, []);
const misnamed = entry("old-name", { nlAvatar: 1, id: "new-name", name: "Misnamed", author: "a", license: "b", light: { size: [64, 64], animations: { idle: { image: "a.png" } }, states: { idle: "idle" } } }, ["a.png"]);
const empty = entry("empty", "", [], { manifest: null, files: [], problem: "no-manifest" });

const folder = "C:\\Users\\someone\\AppData\\Local\\dev.nailongmeow.nl\\avatars";

describe("SettingsScreen's pet section", () => {
  it("offers the ball and every light avatar in light mode, and shows why others cannot be used", async () => {
    const user = userEvent.setup();
    const onPet = vi.fn();
    render(<Settings onPet={onPet} avatars={{ folder, avatars: [lightOnly, both, broken, misnamed, empty], live2d: "no-runtime" }} />);
    const list = screen.getByRole("radiogroup", { name: en.settings.pet.avatar });
    const radios = within(list).getAllByRole("radio");
    expect(radios).toHaveLength(6);
    expect(within(list).getByRole("radio", { name: /Ball/ })).toHaveProperty("checked", true);
    expect(within(list).getByText("Jane · CC BY 4.0")).toBeTruthy();
    expect(within(list).getByText(en.settings.pet.noAuthor)).toBeTruthy();
    expect(within(list).getByText(en.settings.pet.development)).toBeTruthy();
    expect(within(list).getByRole("radio", { name: /broken/ })).toHaveProperty("disabled", true);
    expect(within(list).getByText(en.settings.pet.manifestProblem("light.animations"))).toBeTruthy();
    expect(within(list).getByText(en.settings.pet.folderProblem("new-name"))).toBeTruthy();
    expect(within(list).getByText(en.settings.pet.problem["no-manifest"])).toBeTruthy();

    await user.click(within(list).getByRole("radio", { name: /Mochi/ }));
    expect(onPet).toHaveBeenLastCalledWith({ ...DEFAULT_PET, light: "mochi" });
    expect(screen.getByText(/dev\.nailongmeow\.nl\\avatars$/)).toBeTruthy();
  });

  it("lists Live2D avatars in Live2D mode and says when this build cannot show them", async () => {
    const user = userEvent.setup();
    const onPet = vi.fn();
    render(<Settings onPet={onPet} avatars={{ folder, avatars: [lightOnly, both], live2d: "no-runtime" }} />);
    await user.click(within(screen.getByRole("radiogroup", { name: en.settings.pet.mode })).getByRole("radio", { name: "Live2D" }));
    expect(onPet).toHaveBeenLastCalledWith({ ...DEFAULT_PET, mode: "live2d" });
    expect(screen.getByText(en.settings.pet.live2dStatus["no-runtime"])).toBeTruthy();
    const list = screen.getByRole("radiogroup", { name: en.settings.pet.avatar });
    expect(within(list).getAllByRole("radio").map((radio) => radio.closest("label")?.textContent)).toEqual([expect.stringContaining("Whale")]);
    await user.click(within(list).getByRole("radio", { name: /Whale/ }));
    expect(onPet).toHaveBeenLastCalledWith({ ...DEFAULT_PET, mode: "live2d", live2d: "whale" });
  });

  it("says nothing about the runtime when Live2D can show", () => {
    render(<Settings avatars={{ folder, avatars: [both], live2d: "ready" }} initialPet={{ ...DEFAULT_PET, mode: "live2d", live2d: "whale" }} />);
    for (const text of Object.values(en.settings.pet.live2dStatus).filter(Boolean)) expect(screen.queryByText(text)).toBeNull();
    expect(within(screen.getByRole("radiogroup", { name: en.settings.pet.avatar })).getByRole("radio", { name: /Whale/ })).toHaveProperty("checked", true);
  });

  it("shows how to import with an AI agent", () => {
    render(<Settings avatars={{ folder, avatars: [], live2d: "no-runtime" }} />);
    expect(screen.getByText(en.settings.pet.empty)).toBeTruthy();
    expect(screen.getByText(SKILL_COMMAND)).toBeTruthy();
    expect(SKILL_COMMAND).toBe("npx skills add NaiLongMeow/NL --skill nl-avatar");
  });

  it("has notifications on until the user turns them off", async () => {
    const user = userEvent.setup();
    const onNotifyMessages = vi.fn();
    render(<Settings onNotifyMessages={onNotifyMessages} />);
    const messages = screen.getByRole("switch", { name: en.settings.notifications.messages });
    expect(messages.getAttribute("aria-checked")).toBe("true");
    await user.click(messages);
    expect(onNotifyMessages).toHaveBeenLastCalledWith(false);
    expect(messages.getAttribute("aria-checked")).toBe("false");
  });

  it("hides and shows the pet", async () => {
    const user = userEvent.setup();
    const onPet = vi.fn();
    render(<Settings onPet={onPet} avatars={{ folder, avatars: [], live2d: "no-runtime" }} />);
    const show = screen.getByRole("switch", { name: en.settings.pet.show });
    expect(show.getAttribute("aria-checked")).toBe("true");
    await user.click(show);
    expect(onPet).toHaveBeenLastCalledWith({ ...DEFAULT_PET, shown: false });
  });

  it("says avatars need the desktop app outside it", () => {
    render(<Settings />);
    expect(screen.getByText(en.settings.pet.desktopOnly)).toBeTruthy();
    expect(screen.queryByText(SKILL_COMMAND)).toBeNull();
  });
});
