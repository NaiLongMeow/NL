import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { createFakeSource } from "./fake";
import { SessionSettings } from "./SessionSettings";

function renderSettings() {
  const conversation = createFakeSource("en").conversation("presentation")!;
  const onClose = vi.fn();
  const onSave = vi.fn();
  render(
    <I18nProvider initial="en">
      <SessionSettings conversation={conversation} onClose={onClose} onSave={onSave} />
    </I18nProvider>,
  );
  return { onClose, onSave };
}

describe("SessionSettings", () => {
  it("saves the title and Accept tasks together", async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = renderSettings();
    const dialog = screen.getByRole("dialog", { name: en.sessionSettings.title });
    expect(dialog).toBeTruthy();
    const title = screen.getByRole("textbox", { name: en.sessionSettings.name });
    expect((title as HTMLInputElement).value).toBe("Presentation day");
    await user.clear(title);
    await user.type(title, "  The big day ");
    await user.click(screen.getByRole("switch", { name: en.header.acceptTasks }));
    await user.click(screen.getByRole("button", { name: en.sessionSettings.save }));
    expect(onSave).toHaveBeenCalledWith("The big day", true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("changes nothing on Cancel or Esc, and cannot save an empty title", async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = renderSettings();
    await user.clear(screen.getByRole("textbox", { name: en.sessionSettings.name }));
    expect((screen.getByRole("button", { name: en.sessionSettings.save }) as HTMLButtonElement).disabled).toBe(true);
    await user.keyboard("{Enter}");
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: en.sessionSettings.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard("{Escape}");
    expect(onSave).not.toHaveBeenCalled();
  });
});
