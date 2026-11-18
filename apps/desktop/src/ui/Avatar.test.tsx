import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("is an image named by its label, and hidden from assistive technology without one", () => {
    const { container } = render(
      <>
        <Avatar size={32} label="Dafeiyu" />
        <Avatar size={22} />
      </>,
    );
    expect(screen.getByRole("img", { name: "Dafeiyu" })).toBeTruthy();
    const [, unlabeled] = container.querySelectorAll("span");
    expect(unlabeled!.getAttribute("aria-hidden")).toBe("true");
    expect(unlabeled!.getAttribute("role")).toBeNull();
  });

  it("shows the live character's cue, and no cue beside past messages", () => {
    const { container } = render(
      <>
        <Avatar size={20} cue="working" />
        <Avatar size={22} cue="listening" />
        <Avatar size={32} />
      </>,
    );
    expect([...container.querySelectorAll(":scope > span")].map((avatar) => avatar.getAttribute("data-cue"))).toEqual([
      "working",
      "listening",
      null,
    ]);
  });

  it("gives every avatar on the page its own clip, so that each ball is shaded by its own outline", () => {
    const { container } = render(
      <>
        <Avatar size={32} />
        <Avatar size={32} />
      </>,
    );
    const clips = [...container.querySelectorAll("clipPath")].map((clip) => clip.id);
    expect(new Set(clips).size).toBe(2);
    for (const id of clips) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    const references = [...container.querySelectorAll("circle[clip-path]")].map((circle) => circle.getAttribute("clip-path"));
    expect(references).toEqual(clips.map((id) => `url(#${id})`));
  });

  it("starts each avatar's blinking at its own point, within a few seconds", () => {
    const { container } = render(
      <>
        {Array.from({ length: 6 }, (_, index) => (
          <Avatar key={index} size={32} />
        ))}
      </>,
    );
    const delays = [...container.querySelectorAll<HTMLElement>(":scope > span")].map((avatar) =>
      parseFloat(avatar.style.getPropertyValue("--blink-delay")),
    );
    for (const delay of delays) expect(delay).toBeGreaterThan(-5.01);
    for (const delay of delays) expect(delay).toBeLessThanOrEqual(0);
    expect(new Set(delays).size).toBeGreaterThan(1);
  });
});
