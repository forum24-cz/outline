"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ImportsListSchema = exports.ImportsInfoSchema = exports.ImportsDeleteSchema = exports.ImportsCreateSchema = exports.ImportsCancelSchema = void 0;
var _zod = require("zod");
var _schema = require("./../../../../shared/schema");
var _types = require("./../../../../shared/types");
var _schema2 = require("../schema");
const BaseIdSchema = _zod.z.object({
  /** Id of the import */
  id: _zod.z.string().uuid()
});
const ImportsSortParamsSchema = _zod.z.object({
  /** Specifies the attributes by which imports will be sorted in the list. */
  sort: _zod.z.string().refine(val => ["createdAt", "updatedAt", "service"].includes(val), {
    message: "Invalid sort parameter"
  }).default("createdAt"),
  /** Specifies the sort order with respect to sort field. */
  direction: _zod.z.string().optional().transform(val => val !== "ASC" ? "DESC" : val)
});
const BaseBodySchema = _zod.z.object({
  integrationId: _zod.z.string().uuid()
});
const ImportsCreateSchema = exports.ImportsCreateSchema = _schema2.BaseSchema.extend({
  body: _zod.z.discriminatedUnion("service", [BaseBodySchema.extend({
    service: _zod.z.literal(_types.IntegrationService.Notion),
    input: _zod.z.array(_schema.NotionImportInputItemSchema)
  })])
});
const ImportsListSchema = exports.ImportsListSchema = _schema2.BaseSchema.extend({
  body: ImportsSortParamsSchema.extend({
    service: _zod.z.nativeEnum(_types.ImportableIntegrationService).optional()
  })
});
const ImportsInfoSchema = exports.ImportsInfoSchema = _schema2.BaseSchema.extend({
  body: BaseIdSchema
});
const ImportsDeleteSchema = exports.ImportsDeleteSchema = _schema2.BaseSchema.extend({
  body: BaseIdSchema
});
const ImportsCancelSchema = exports.ImportsCancelSchema = _schema2.BaseSchema.extend({
  body: BaseIdSchema
});