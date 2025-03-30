"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotionImportTaskInputItemSchema = exports.NotionImportInputItemSchema = exports.BaseImportTaskInputItemSchema = void 0;
var _zod = require("zod");
var _types = require("./types");
var _types2 = require("./../plugins/notion/shared/types");
const BaseImportInputItemSchema = _zod.z.object({
  permission: _zod.z.nativeEnum(_types.CollectionPermission).optional()
});
const NotionImportInputItemSchema = exports.NotionImportInputItemSchema = BaseImportInputItemSchema.extend({
  type: _zod.z.nativeEnum(_types2.PageType).optional(),
  externalId: _zod.z.string().optional()
});
const BaseImportTaskInputItemSchema = exports.BaseImportTaskInputItemSchema = _zod.z.object({
  externalId: _zod.z.string(),
  parentExternalId: _zod.z.string().optional(),
  collectionExternalId: _zod.z.string().optional()
});
const NotionImportTaskInputItemSchema = exports.NotionImportTaskInputItemSchema = BaseImportTaskInputItemSchema.extend({
  type: _zod.z.nativeEnum(_types2.PageType)
});

// No reason to be here except for co-location with import task input.