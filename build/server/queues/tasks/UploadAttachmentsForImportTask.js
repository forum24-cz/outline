"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _asyncSema = require("async-sema");
var _Logger = _interopRequireDefault(require("./../../logging/Logger"));
var _models = require("./../../models");
var _files = _interopRequireDefault(require("./../../storage/files"));
var _BaseTask = _interopRequireWildcard(require("./BaseTask"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const ConcurrentUploads = 5;
/**
 * A task that uploads a list of provided urls to known attachments.
 */
class UploadAttachmentsForImportTask extends _BaseTask.default {
  async perform(items) {
    const sema = new _asyncSema.Sema(ConcurrentUploads, {
      // perf: pre-allocate the queue size
      capacity: items.length > ConcurrentUploads ? items.length : ConcurrentUploads
    });
    const uploadPromises = items.map(async item => {
      try {
        await sema.acquire();
        const attachment = await _models.Attachment.findByPk(item.attachmentId, {
          rejectOnEmpty: true
        });

        // This means the attachment has already been uploaded.
        if (String(attachment.size) !== "0") {
          return;
        }
        const res = await _files.default.storeFromUrl(item.url, attachment.key, attachment.acl);
        if (res) {
          await attachment.update({
            size: res.contentLength,
            contentType: res.contentType
          });
        }
      } catch (err) {
        _Logger.default.error("error uploading attachments for import", err);
        throw err;
      } finally {
        sema.release();
      }
    });
    return await Promise.all(uploadPromises);
  }
  get options() {
    return {
      attempts: 3,
      priority: _BaseTask.TaskPriority.Normal
    };
  }
}
exports.default = UploadAttachmentsForImportTask;