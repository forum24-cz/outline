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
var _database = require("./../../storage/database");
var _BaseTask = _interopRequireWildcard(require("./BaseTask"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * A task that moves the stuck imports to errored state.
 */
class ErrorTimedOutImportsTask extends _BaseTask.default {
  async perform(_ref) {
    let {
      limit
    } = _ref;
    // TODO: Hardcoded right now, configurable later
    const thresholdHours = 12;
    const cutOffTime = (0, _dateFns.subHours)(new Date(), thresholdHours);
    const importsErrored = {};
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await _models.ImportTask.findAllInBatches({
        where: {
          state: [_types.ImportTaskState.Created, _types.ImportTaskState.InProgress],
          createdAt: {
            [_sequelize.Op.lt]: cutOffTime
          }
        },
        include: [{
          model: _models.Import.unscoped(),
          as: "import",
          required: true
        }],
        order: [["createdAt", "ASC"], ["id", "ASC"]],
        batchLimit: 1000,
        totalLimit: limit
      }, async importTasks => {
        for (const importTask of importTasks) {
          const associatedImport = importTask.import;
          if (associatedImport.state === _types.ImportState.Canceled) {
            continue; // import_tasks for a canceled import are not considered stuck.
          }
          await _database.sequelize.transaction(async transaction => {
            importTask.state = _types.ImportTaskState.Errored;
            importTask.error = "Timed out";
            await importTask.save({
              transaction
            });

            // this import could have been seen before in another import_task.
            if (!importsErrored[associatedImport.id]) {
              associatedImport.state = _types.ImportState.Errored;
              associatedImport.error = "Timed out";
              await associatedImport.save({
                transaction
              });
              importsErrored[associatedImport.id] = true;
            }
          });
        }
      });
    } finally {
      const totalImportsErrored = Object.keys(importsErrored).length;
      if (totalImportsErrored > 0) {
        _Logger.default.info("task", `Updated ${totalImportsErrored} imports to error status`);
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
exports.default = ErrorTimedOutImportsTask;
_defineProperty(ErrorTimedOutImportsTask, "cron", _BaseTask.TaskSchedule.Hour);