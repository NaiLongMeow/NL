/**
 * System notifications (UI design note, section 4.14), shown by each
 * system's own notification service through tauri-plugin-notification.
 *
 * *(user, 2026-11-19)* They are on by default, and the user can turn them
 * off, for instance not to be disturbed; the choice is kept on this device.
 * Outside the desktop app nothing is shown.
 */

import { isTauri } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

/** Where the choice is kept. */
export const NOTIFY_KEY = "nl.notifyMessages";

/** A notification shows the start of a long message; the window has the rest. */
export const NOTIFICATION_TEXT = 200;

/** Whether messages may become notifications: yes, unless the user said no. */
export function loadNotify(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): boolean {
  return storage?.getItem(NOTIFY_KEY) !== "off";
}

export function saveNotify(on: boolean, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  storage?.setItem(NOTIFY_KEY, on ? "on" : "off");
}

/** The body of a message's notification: its text, cut short when long. */
export function notificationText(text: string): string {
  const characters = [...text];
  return characters.length > NOTIFICATION_TEXT ? `${characters.slice(0, NOTIFICATION_TEXT - 1).join("")}…` : text;
}

/** Shows a notification, asking the system for permission the first time. */
export async function notify(title: string, body: string): Promise<void> {
  if (!isTauri()) return;
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === "granted";
  if (granted) sendNotification({ title, body: notificationText(body) });
}
