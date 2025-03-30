"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotionSearchSchema = exports.NotionCallbackSchema = void 0;
var _isEmpty = _interopRequireDefault(require("lodash/isEmpty"));
var _zod = require("zod");
var _schema = require("./../../../../server/routes/api/schema");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const NotionCallbackSchema = exports.NotionCallbackSchema = _schema.BaseSchema.extend({
  query: _zod.z.object({
    code: _zod.z.string().nullish(),
    state: _zod.z.string(),
    error: _zod.z.string().nullish()
  }).refine(req => !((0, _isEmpty.default)(req.code) && (0, _isEmpty.default)(req.error)), {
    message: "one of code or error is required"
  })
});
const NotionSearchSchema = exports.NotionSearchSchema = _schema.BaseSchema.extend({
  body: _zod.z.object({
    integrationId: _zod.z.string().uuid()
  })
});