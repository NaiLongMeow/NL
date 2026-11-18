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

  it("shows the character's state, idle unless told otherwise", () => {
    const { container } = render(
      <>
        <Avatar size={20} cue="working" />
        <Avatar size={22} cue="approval" />
        <Avatar size={22} cue="question" />
        <Avatar size={22} cue="device" />
        <Avatar size={22} cue="listening" />
        <Avatar size={32} />
      </>,
    );
    expect([...container.querySelectorAll(":scope > span")].map((avatar) => avatar.getAttribute("data-cue"))).toEqual([
      "working",
      "approval",
      "question",
      "device",
      "listening",
      "idle",
    ]);
  });

  it("gives every avatar on the page its own clip, so that each ball is shaded within its own outline", () => {
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

  it("starts each avatar's loops at its own point, within a few seconds, so that they never move in step", () => {
    const { container } = render(
      <>
        {Array.from({ length: 6 }, (_, index) => (
          <Avatar key={index} size={32} />
        ))}
      </>,
    );
    const phases = [...container.querySelectorAll<HTMLElement>(":scope > span")].map((avatar) =>
      Number(avatar.style.getPropertyValue("--phase")),
    );
    for (const phase of phases) expect(phase).toBeGreaterThanOrEqual(0);
    for (const phase of phases) expect(phase).toBeLessThan(5);
    expect(new Set(phases).size).toBeGreaterThan(1);
  });
});
