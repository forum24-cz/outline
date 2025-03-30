"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _prosemirrorModel = require("prosemirror-model");
var _editor = require("./../../editor");
var _models = require("./../../models");
var _BaseTask = _interopRequireDefault(require("./BaseTask"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class DocumentUpdateTextTask extends _BaseTask.default {
  async perform(event) {
    const document = await _models.Document.findByPk(event.documentId);
    if (!document?.content) {
      return;
    }
    const node = _prosemirrorModel.Node.fromJSON(_editor.schema, document.content);
    document.text = _editor.serializer.serialize(node);
    await document.save({
      silent: true
    });
  }
}
exports.default = DocumentUpdateTextTask;