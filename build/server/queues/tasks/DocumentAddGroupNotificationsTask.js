"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _sequelize = require("sequelize");
var _models = require("./../../models");
var _BaseTask = _interopRequireWildcard(require("./BaseTask"));
var _DocumentAddUserNotificationsTask = _interopRequireDefault(require("./DocumentAddUserNotificationsTask"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
class DocumentAddGroupNotificationsTask extends _BaseTask.default {
  async perform(event) {
    await _models.GroupUser.findAllInBatches({
      where: {
        groupId: event.modelId,
        userId: {
          [_sequelize.Op.ne]: event.actorId
        }
      },
      batchLimit: 10
    }, async groupUsers => {
      await Promise.all(groupUsers.map(async groupUser => {
        await _DocumentAddUserNotificationsTask.default.schedule({
          ...event,
          modelId: event.data.membershipId,
          userId: groupUser.userId
        });
      }));
    });
  }
  get options() {
    return {
      priority: _BaseTask.TaskPriority.Background
    };
  }
}
exports.default = DocumentAddGroupNotificationsTask;