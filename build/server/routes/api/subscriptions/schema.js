"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SubscriptionsListSchema = exports.SubscriptionsInfoSchema = exports.SubscriptionsDeleteTokenSchema = exports.SubscriptionsDeleteSchema = exports.SubscriptionsCreateSchema = void 0;
var _isEmpty = _interopRequireDefault(require("lodash/isEmpty"));
var _zod = require("zod");
var _types = require("./../../../../shared/types");
var _validation = require("./../../../validation");
var _schema = require("../schema");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const SubscriptionBody = _zod.z.object({
  event: _zod.z.literal(_types.SubscriptionType.Document),
  collectionId: _zod.z.string().uuid().optional(),
  documentId: _zod.z.string().refine(_validation.ValidateDocumentId.isValid, {
    message: _validation.ValidateDocumentId.message
  }).optional()
}).refine(obj => !((0, _isEmpty.default)(obj.collectionId) && (0, _isEmpty.default)(obj.documentId)), {
  message: "one of collectionId or documentId is required"
});
const SubscriptionsListSchema = exports.SubscriptionsListSchema = _schema.BaseSchema.extend({
  body: SubscriptionBody
});
const SubscriptionsInfoSchema = exports.SubscriptionsInfoSchema = _schema.BaseSchema.extend({
  body: SubscriptionBody
});
const SubscriptionsCreateSchema = exports.SubscriptionsCreateSchema = _schema.BaseSchema.extend({
  body: SubscriptionBody
});
const SubscriptionsDeleteSchema = exports.SubscriptionsDeleteSchema = _schema.BaseSchema.extend({
  body: _zod.z.object({
    id: _zod.z.string().uuid()
  })
});
const SubscriptionsDeleteTokenSchema = exports.SubscriptionsDeleteTokenSchema = _schema.BaseSchema.extend({
  query: _zod.z.object({
    follow: _zod.z.string().default(""),
    userId: _zod.z.string().uuid(),
    documentId: _zod.z.string().uuid(),
    token: _zod.z.string()
  })
});