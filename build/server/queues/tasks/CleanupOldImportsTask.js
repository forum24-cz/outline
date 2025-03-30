"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _dateFns = require("date-fns");
var _sequelize = require("sequelize");
var _types = require("./../../../shared/types");
var _Logger = _interopRequireDefault(require("./../../logging/Logger"));
var _models = require("./../../models");
var _BaseTask = _interopRequireWildcard(require("./BaseTask"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * A task that deletes the import_tasks for old imports which are completed, errored (or) canceled.
 */
class CleanupOldImportsTask extends _BaseTask.default {
  async perform() {
    // TODO: Hardcoded right now, configurable later
    const retentionDays = 1;
    const cutoffDate = (0, _dateFns.subDays)(new Date(), retentionDays);
    const maxImportsPerTask = 1000;
    let totalTasksDeleted = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await _models.Import.findAllInBatches({
        attributes: ["id"],
        where: {
          state: [_types.ImportState.Completed, _types.ImportState.Errored, _types.ImportState.Canceled],
          createdAt: {
            [_sequelize.Op.lt]: cutoffDate
          }
        },
        order: [["createdAt", "ASC"], ["id", "ASC"]],
        batchLimit: 50,
        totalLimit: maxImportsPerTask,
        paranoid: false
      }, async imports => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await _models.ImportTask.findAllInBatches({
          attributes: ["id"],
          where: {
            importId: imports.map(importModel => importModel.id)
          },
          order: [["createdAt", "ASC"], ["id", "ASC"]],
          batchLimit: 1000
        }, async importTasks => {
          totalTasksDeleted += await _models.ImportTask.destroy({
            where: {
              id: importTasks.map(importTask => importTask.id)
            }
          });
        });
      });
    } finally {
      if (totalTasksDeleted > 0) {
        _Logger.default.info("task", `Deleted old import_tasks`, {
          totalTasksDeleted
        });
      }
    }
  }
  get options() {
    return {
      attempts: 1,
      priority: _BaseTask.TaskPriority.Background
    };
  }
}
exports.default = CleanupOldImportsTask;
_defineProperty(CleanupOldImportsTask, "cron", _BaseTask.TaskSchedule.Day);