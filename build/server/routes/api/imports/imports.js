"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _koaRouter = _interopRequireDefault(require("koa-router"));
var _truncate = _interopRequireDefault(require("lodash/truncate"));
var _types = require("./../../../../shared/types");
var _validations = require("./../../../../shared/validations");
var _errors = require("./../../../errors");
var _authentication = _interopRequireDefault(require("./../../../middlewares/authentication"));
var _transaction = require("./../../../middlewares/transaction");
var _validate = _interopRequireDefault(require("./../../../middlewares/validate"));
var _models = require("./../../../models");
var _Import = _interopRequireDefault(require("./../../../models/Import"));
var _policies = require("./../../../policies");
var _presenters = require("./../../../presenters");
var _pagination = _interopRequireDefault(require("../middlewares/pagination"));
var T = _interopRequireWildcard(require("./schema"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = new _koaRouter.default();
router.post("imports.create", (0, _authentication.default)({
  role: _types.UserRole.Admin
}), (0, _validate.default)(T.ImportsCreateSchema), (0, _transaction.transaction)(), async ctx => {
  const {
    integrationId,
    service,
    input
  } = ctx.input.body;
  const {
    user
  } = ctx.state.auth;
  (0, _policies.authorize)(user, "createImport", user.team);
  const importInProgress = await _Import.default.count({
    where: {
      state: [_types.ImportState.Created, _types.ImportState.InProgress, _types.ImportState.Processed],
      teamId: user.teamId
    }
  });
  if (importInProgress) {
    throw (0, _errors.UnprocessableEntityError)("An import is already in progress");
  }
  const integration = await _models.Integration.findByPk(integrationId, {
    rejectOnEmpty: true
  });
  (0, _policies.authorize)(user, "read", integration);
  const name = integration.settings.externalWorkspace.name;
  const importModel = await _Import.default.createWithCtx(ctx, {
    name: (0, _truncate.default)(name, {
      length: _validations.ImportValidation.maxNameLength
    }),
    service,
    state: _types.ImportState.Created,
    input,
    integrationId,
    createdById: user.id,
    teamId: user.teamId
  });
  importModel.createdBy = user;
  ctx.body = {
    data: (0, _presenters.presentImport)(importModel),
    policies: (0, _presenters.presentPolicies)(user, [importModel])
  };
});
router.post("imports.list", (0, _authentication.default)({
  role: _types.UserRole.Admin
}), (0, _pagination.default)(), (0, _validate.default)(T.ImportsListSchema), async ctx => {
  const {
    service,
    sort,
    direction
  } = ctx.input.body;
  const {
    user
  } = ctx.state.auth;
  (0, _policies.authorize)(user, "listImports", user.team);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where = {
    teamId: user.teamId
  };
  if (service) {
    where.service = service;
  }
  const [imports, total] = await Promise.all([
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _Import.default.findAll({
    where,
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _Import.default.count({
    where
  })]);
  ctx.body = {
    pagination: {
      ...ctx.state.pagination,
      total
    },
    data: imports.map(_presenters.presentImport),
    policies: (0, _presenters.presentPolicies)(user, imports)
  };
});
router.post("imports.info", (0, _authentication.default)({
  role: _types.UserRole.Admin
}), (0, _validate.default)(T.ImportsInfoSchema), async ctx => {
  const {
    id
  } = ctx.input.body;
  const {
    user
  } = ctx.state.auth;
  const importModel = await _Import.default.findByPk(id, {
    rejectOnEmpty: true
  });
  (0, _policies.authorize)(user, "read", importModel);
  ctx.body = {
    data: (0, _presenters.presentImport)(importModel),
    policies: (0, _presenters.presentPolicies)(user, [importModel])
  };
});
router.post("imports.delete", (0, _authentication.default)({
  role: _types.UserRole.Admin
}), (0, _validate.default)(T.ImportsDeleteSchema), (0, _transaction.transaction)(), async ctx => {
  const {
    id
  } = ctx.input.body;
  const {
    user
  } = ctx.state.auth;
  const {
    transaction
  } = ctx.state;
  const importModel = await _Import.default.findByPk(id, {
    rejectOnEmpty: true,
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  (0, _policies.authorize)(user, "delete", importModel);
  await importModel.destroyWithCtx(ctx);
  ctx.body = {
    success: true
  };
});
router.post("imports.cancel", (0, _authentication.default)({
  role: _types.UserRole.Admin
}), (0, _validate.default)(T.ImportsCancelSchema), (0, _transaction.transaction)(), async ctx => {
  const {
    id
  } = ctx.input.body;
  const {
    user
  } = ctx.state.auth;
  const {
    transaction
  } = ctx.state;
  let importModel = await _Import.default.findByPk(id, {
    rejectOnEmpty: true,
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  (0, _policies.authorize)(user, "cancel", importModel);
  importModel.state = _types.ImportState.Canceled;
  importModel = await importModel.saveWithCtx(ctx);
  ctx.body = {
    data: (0, _presenters.presentImport)(importModel),
    policies: (0, _presenters.presentPolicies)(user, [importModel])
  };
});
var _default = exports.default = router;