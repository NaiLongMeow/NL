/**
 * Test setup for the desktop windows' components (vite.config.ts,
 * test.setupFiles).
 */

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library unmounts after each test only when the test runner has
// global hooks; Vitest's are imported, so register the cleanup here.
afterEach(cleanup);

// jsdom has no ResizeObserver, which Radix uses to measure triggers and
// switches. Nothing in these tests depends on sizes, so a stub will do.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
