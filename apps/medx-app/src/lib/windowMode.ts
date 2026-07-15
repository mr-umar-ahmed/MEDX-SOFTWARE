/**
 * True when this renderer is the read-only counter display window
 * (opened from Queue/Tokens via "Open Counter Display" → #/display).
 *
 * The display window must never persist state or run background engines:
 * it holds a snapshot from open time, and writing that snapshot back would
 * overwrite newer data saved by the main window.
 */
export const IS_DISPLAY_WINDOW =
  typeof window !== "undefined" && window.location.hash.startsWith("#/display");
