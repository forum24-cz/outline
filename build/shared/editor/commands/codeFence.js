"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.outdentInCode = exports.newlineInCode = exports.moveToPreviousNewline = exports.moveToNextNewline = exports.indentInCode = exports.enterInCode = void 0;
var _prosemirrorCommands = require("prosemirror-commands");
var _prosemirrorState = require("prosemirror-state");
var _findNewlines = require("../queries/findNewlines");
var _isInCode = require("../queries/isInCode");
const newline = "\n";
const tabSize = 2;

/**
 * Moves the current selection to the previous newline, this is used inside
 * code fences only, prosemirror handles this functionality fine in other nodes.
 *
 * @returns A prosemirror command.
 */
const moveToPreviousNewline = (state, dispatch) => {
  if (!(0, _isInCode.isInCode)(state)) {
    return false;
  }
  const $pos = state.selection.$from;
  if (!$pos.parent.type.isTextblock) {
    return false;
  }
  dispatch?.(state.tr.setSelection(_prosemirrorState.TextSelection.create(state.doc, (0, _findNewlines.findPreviousNewline)($pos))).scrollIntoView());
  return true;
};

/**
 * Moves the current selection to the next newline, this is used inside code
 * fences only, prosemirror handles this functionality fine in other nodes.
 *
 * @returns A prosemirror command.
 */
exports.moveToPreviousNewline = moveToPreviousNewline;
const moveToNextNewline = (state, dispatch) => {
  if (!(0, _isInCode.isInCode)(state)) {
    return false;
  }
  const $pos = state.selection.$to;
  if (!$pos.parent.type.isTextblock) {
    return false;
  }
  dispatch?.(state.tr.setSelection(_prosemirrorState.TextSelection.create(state.doc, (0, _findNewlines.findNextNewline)($pos))).scrollIntoView());
  return true;
};

/**
 * Replace the selection with a newline character preceeded by a number of
 * spaces to have the new line align with the code on the previous. This is
 * standard code editor behavior.
 *
 * @returns A prosemirror command
 */
exports.moveToNextNewline = moveToNextNewline;
const newlineInCode = (state, dispatch) => {
  if (!(0, _isInCode.isInCode)(state)) {
    return false;
  }
  const {
    tr,
    selection
  } = state;
  const text = selection.$anchor.nodeBefore?.text;
  let newText = newline;
  if (text) {
    const splitByNewLine = text.split(newline);
    const offset = splitByNewLine[splitByNewLine.length - 1].search(/\S|$/);
    newText += " ".repeat(offset);
  }
  dispatch?.(tr.insertText(newText, selection.from, selection.to));
  return true;
};

/**
 * Indent the current selection by two spaces, accounting for multiple lines.
 *
 * @returns A prosemirror command
 */
exports.newlineInCode = newlineInCode;
const indentInCode = (state, dispatch) => {
  if (!(0, _isInCode.isInCode)(state, {
    onlyBlock: true
  })) {
    return false;
  }
  const spaces = " ".repeat(tabSize);
  const {
    tr,
    selection
  } = state;
  const {
    $from,
    from,
    to
  } = selection;

  // If the selection is empty, just insert two spaces at the cursor position.
  if (selection.empty) {
    dispatch?.(tr.insertText(spaces, from).setSelection(_prosemirrorState.TextSelection.create(tr.doc, from + spaces.length)));
    return true;
  }
  if (dispatch) {
    let line = 1;
    tr.insertText(spaces, (0, _findNewlines.findPreviousNewline)($from));

    // Find all newlines in the selection and insert spaces before them.
    let index = from + 1;
    while (index <= to - 1 + line * tabSize) {
      const newLineBefore = tr.doc.textBetween(index - 1, index) === newline;
      if (newLineBefore) {
        tr.insertText(spaces, index);
        line++;
      }
      index++;
    }
    tr.setSelection(_prosemirrorState.TextSelection.create(tr.doc, from + tabSize, to + line * tabSize));
    dispatch(tr);
    return true;
  }
  return false;
};

/**
 * Outdent the current selection by two spaces, accounting for multiple lines.
 *
 * @returns A prosemirror command
 */
exports.indentInCode = indentInCode;
const outdentInCode = (state, dispatch) => {
  if (!(0, _isInCode.isInCode)(state, {
    onlyBlock: true
  })) {
    return false;
  }
  if (dispatch) {
    const {
      tr,
      selection
    } = state;
    const {
      $from,
      from,
      to
    } = selection;
    const selectionLength = to - from;
    let line = 1;

    // Find all newlines in the selection and remove tab-sized spaces before
    // them, working backwards to avoid changing the offset.
    let index = to - 1;
    let totalSpacesRemoved = 0;
    let spacesRemovedOnFirstLine = 0;
    const startOfFirstLine = (0, _findNewlines.findPreviousNewline)($from);
    while (index >= startOfFirstLine - line * tabSize) {
      const newLineBefore = tr.doc.textBetween(index - 1, index) === newline || index === startOfFirstLine;
      if (newLineBefore) {
        // Remove upto offset spaces from the start of the line.
        const textToConsider = tr.doc.textBetween(index, index + tabSize);

        // Find number of spaces in textToConsider
        let spaces = 0;
        for (let i = 0; i < textToConsider.length; i++) {
          if (textToConsider[i] === " ") {
            spaces++;
          } else {
            break;
          }
        }
        spacesRemovedOnFirstLine = spaces;
        if (spaces > 0) {
          tr.delete(index, index + spaces);
          totalSpacesRemoved += spaces;
        }
        line++;
      }
      index--;
    }
    tr.setSelection(_prosemirrorState.TextSelection.create(tr.doc, to - selectionLength - spacesRemovedOnFirstLine, to - totalSpacesRemoved));
    dispatch(tr);
    return true;
  }
  return false;
};

/**
 * Exit the code block by moving the cursor to the end of the code block and
 * inserting a newline character.
 *
 * @returns A prosemirror command
 */
exports.outdentInCode = outdentInCode;
const enterInCode = (state, dispatch) => {
  if (!(0, _isInCode.isInCode)(state, {
    onlyBlock: true
  })) {
    return false;
  }
  const {
    selection
  } = state;
  const text = selection.$anchor.nodeBefore?.text;
  const selectionAtEnd = selection.$anchor.parentOffset === selection.$anchor.parent.nodeSize - 2;
  if (selectionAtEnd && text?.endsWith(newline)) {
    (0, _prosemirrorCommands.exitCode)(state, dispatch);
    return true;
  }
  return newlineInCode(state, dispatch);
};
exports.enterInCode = enterInCode;