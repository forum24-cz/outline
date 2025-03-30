"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _types = require("./../../../shared/types");
var _Logger = _interopRequireDefault(require("./../../logging/Logger"));
var _models = require("./../../models");
var _permissions = require("./../../utils/permissions");
var _BaseTask = _interopRequireWildcard(require("./BaseTask"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class DocumentAddUserNotificationsTask extends _BaseTask.default {
  async perform(event) {
    const permission = event.changes?.attributes.permission;
    if (!permission) {
      _Logger.default.info("task", `permission not available in the DocumentAddUserNotificationsTask event`, {
        name: event.name,
        modelId: event.modelId
      });
      return;
    }
    const recipient = await _models.User.findByPk(event.userId);
    if (!recipient || recipient.isSuspended || !recipient.subscribedToEventType(_types.NotificationEventType.AddUserToDocument)) {
      return;
    }
    const isElevated = await (0, _permissions.isElevatedPermission)({
      userId: recipient.id,
      documentId: event.documentId,
      permission,
      skipMembershipId: event.modelId
    });
    if (!isElevated) {
      _Logger.default.debug("task", `Suppressing notification for user ${event.userId} as the new permission does not elevate user's permission to the document`, {
        documentId: event.documentId,
        userId: event.userId,
        permission
      });
      return;
    }
    await _models.Notification.create({
      event: _types.NotificationEventType.AddUserToDocument,
      userId: event.userId,
      actorId: event.actorId,
      teamId: event.teamId,
      documentId: event.documentId,
      membershipId: event.modelId
    });
  }
  get options() {
    return {
      priority: _BaseTask.TaskPriority.Background
    };
  }
}
exports.default = DocumentAddUserNotificationsTask;