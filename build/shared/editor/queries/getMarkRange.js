"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMarkRange = getMarkRange;
function getMarkRange($pos, type) {
  if (!$pos || !type) {
    return false;
  }
  const start = $pos.parent.childAfter($pos.parentOffset);
  if (!start.node) {
    return false;
  }
  const mark = start.node.marks.find(m => m.type === type);
  if (!mark) {
    return false;
  }
  let startIndex = $pos.index();
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;
  while (startIndex > 0 && mark.isInSet($pos.parent.child(startIndex - 1).marks)) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }
  while (endIndex < $pos.parent.childCount && mark.isInSet($pos.parent.child(endIndex).marks)) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }
  return {
    from: startPos,
    to: endPos,
    mark
  };
}