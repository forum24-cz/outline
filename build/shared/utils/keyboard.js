"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.altDisplay = void 0;
exports.isModKey = isModKey;
exports.metaDisplay = exports.meta = void 0;
exports.normalizeKeyDisplay = normalizeKeyDisplay;
var _browser = require("./browser");
/**
 * Returns the display string for the alt key
 */
const altDisplay = exports.altDisplay = (0, _browser.isMac)() ? "⌥" : "Alt";

/**
 * Returns the display string for the meta key
 */
const metaDisplay = exports.metaDisplay = (0, _browser.isMac)() ? "⌘" : "Ctrl";

/**
 * Returns the name of the modifier key
 */
const meta = exports.meta = (0, _browser.isMac)() ? "cmd" : "ctrl";

/**
 * Returns true if the given event is a modifier key (Cmd or Ctrl on Mac, Alt on
 * @param event The event to check
 * @returns True if the event is a modifier key
 */
function isModKey(event) {
  return (0, _browser.isMac)() ? event.metaKey : event.ctrlKey;
}

/**
 * Returns a string with the appropriate display strings for the given key
 *
 * @param key The key to display
 * @returns The display string for the key
 */
function normalizeKeyDisplay(key) {
  return key.replace(/Meta/i, metaDisplay).replace(/Cmd/i, metaDisplay).replace(/Alt/i, altDisplay).replace(/Control/i, metaDisplay).replace(/Shift/i, "⇧");
}