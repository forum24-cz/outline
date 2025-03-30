"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = init;
var _time = require("./../../shared/utils/time");
var _tasks = _interopRequireDefault(require("./../queues/tasks"));
var _BaseTask = require("./../queues/tasks/BaseTask");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function init() {
  async function run(schedule) {
    for (const name in _tasks.default) {
      const TaskClass = _tasks.default[name];
      if (TaskClass.cron === schedule) {
        await TaskClass.schedule({
          limit: 10000
        });
      }
    }
  }
  setInterval(() => void run(_BaseTask.TaskSchedule.Day), _time.Day.ms);
  setInterval(() => void run(_BaseTask.TaskSchedule.Hour), _time.Hour.ms);
  setInterval(() => void run(_BaseTask.TaskSchedule.Minute), _time.Minute.ms);

  // Just give everything time to startup before running the first time. Not
  // _technically_ required to function.
  setTimeout(() => {
    void run(_BaseTask.TaskSchedule.Day);
    void run(_BaseTask.TaskSchedule.Hour);
    void run(_BaseTask.TaskSchedule.Minute);
  }, 5 * _time.Second.ms);
}