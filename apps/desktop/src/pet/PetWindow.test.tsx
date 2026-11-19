import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18n";
import { en } from "../i18n/messages";
import { PetWindow } from "./PetWindow";

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
});
