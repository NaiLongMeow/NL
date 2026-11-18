import { afterEach, describe, expect, it } from "vitest";
import { guardContextMenu, isTextField, keepsContextMenu } from "./webview";

function element(html: string): Element {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  document.body.append(holder);
  return holder.firstElementChild!;
}

describe("the context menu guard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.getSelection()?.removeAllRanges();
  });

  it("knows the fields the user types in", () => {
    expect(isTextField(element("<textarea></textarea>"))).toBe(true);
    expect(isTextField(element("<input>"))).toBe(true);
    expect(isTextField(element('<input type="search">'))).toBe(true);
    expect(isTextField(element('<div contenteditable="true"><b>bold</b></div>').firstElementChild)).toBe(true);
    expect(isTextField(element('<input type="checkbox">'))).toBe(false);
    expect(isTextField(element("<button>Send</button>"))).toBe(false);
    expect(isTextField(element("<p>Text</p>"))).toBe(false);
    expect(isTextField(null)).toBe(false);
  });

  it("keeps the menu in text fields and on selected text only", () => {
    expect(keepsContextMenu(element("<textarea></textarea>"), "")).toBe(true);
    expect(keepsContextMenu(element("<p>Text</p>"), "Text")).toBe(true);
    expect(keepsContextMenu(element("<p>Text</p>"), "  ")).toBe(false);
    expect(keepsContextMenu(element("<button>Send</button>"), "")).toBe(false);
  });

  it("cancels the browser's menu elsewhere, until it is removed", () => {
    const stop = guardContextMenu(document);
    const rightClick = (target: Element) => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(rightClick(element("<p>Plain text</p>"))).toBe(true);
    expect(rightClick(element("<textarea></textarea>"))).toBe(false);

    const paragraph = element("<p>Selected text</p>");
    window.getSelection()!.selectAllChildren(paragraph);
    expect(rightClick(paragraph)).toBe(false);

    stop();
    window.getSelection()!.removeAllRanges();
    expect(rightClick(element("<p>Plain text</p>"))).toBe(false);
  });
});
