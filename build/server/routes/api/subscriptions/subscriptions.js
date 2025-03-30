"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _koaRouter = _interopRequireDefault(require("koa-router"));
var _sequelize = require("sequelize");
var _types = require("./../../../../shared/types");
var _subscriptionCreator = _interopRequireDefault(require("./../../../commands/subscriptionCreator"));
var _context = require("./../../../context");
var _env = _interopRequireDefault(require("./../../../env"));
var _authentication = _interopRequireDefault(require("./../../../middlewares/authentication"));
var _rateLimiter = require("./../../../middlewares/rateLimiter");
var _transaction = require("./../../../middlewares/transaction");
var _validate = _interopRequireDefault(require("./../../../middlewares/validate"));
var _models = require("./../../../models");
var _SubscriptionHelper = _interopRequireDefault(require("./../../../models/helpers/SubscriptionHelper"));
var _policies = require("./../../../policies");
var _presenters = require("./../../../presenters");
var _RateLimiter = require("./../../../utils/RateLimiter");
var _pagination = _interopRequireDefault(require("../middlewares/pagination"));
var T = _interopRequireWildcard(require("./schema"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = new _koaRouter.default();
router.post("subscriptions.list", (0, _authentication.default)(), (0, _pagination.default)(), (0, _validate.default)(T.SubscriptionsListSchema), async ctx => {
  const {
    user
  } = ctx.state.auth;
  const {
    event,
    collectionId,
    documentId
  } = ctx.input.body;
  const where = {
    userId: user.id,
    event
  };
  if (collectionId) {
    const collection = await _models.Collection.scope({
      method: ["withMembership", user.id]
    }).findByPk(collectionId);
    (0, _policies.authorize)(user, "read", collection);
    where.collectionId = collectionId;
  } else {
    // documentId will be available here
    const document = await _models.Document.findByPk(documentId, {
      userId: user.id
    });
    (0, _policies.authorize)(user, "read", document);
    where.documentId = documentId;
  }
  const subscriptions = await _models.Subscription.findAll({
    where,
    order: [["createdAt", "DESC"]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit
  });
  ctx.body = {
    pagination: ctx.state.pagination,
    data: subscriptions.map(_presenters.presentSubscription)
  };
});
router.post("subscriptions.info", (0, _authentication.default)(), (0, _validate.default)(T.SubscriptionsInfoSchema), async ctx => {
  const {
    user
  } = ctx.state.auth;
  const {
    event,
    collectionId,
    documentId
  } = ctx.input.body;
  const where = {
    userId: user.id,
    event
  };
  if (collectionId) {
    const collection = await _models.Collection.scope({
      method: ["withMembership", user.id]
    }).findByPk(collectionId);
    (0, _policies.authorize)(user, "read", collection);
    where.collectionId = collectionId;
  } else {
    // documentId will be available here
    const document = await _models.Document.findByPk(documentId, {
      userId: user.id
    });
    (0, _policies.authorize)(user, "read", document);
    where.documentId = documentId;
  }

  // There can be only one subscription with these props.
  const subscription = await _models.Subscription.findOne({
    where,
    rejectOnEmpty: true
  });
  ctx.body = {
    data: (0, _presenters.presentSubscription)(subscription)
  };
});
router.post("subscriptions.create", (0, _authentication.default)(), (0, _validate.default)(T.SubscriptionsCreateSchema), (0, _transaction.transaction)(), async ctx => {
  const {
    user
  } = ctx.state.auth;
  const {
    event,
    collectionId,
    documentId
  } = ctx.input.body;
  if (collectionId) {
    const collection = await _models.Collection.scope({
      method: ["withMembership", user.id]
    }).findByPk(collectionId);
    (0, _policies.authorize)(user, "subscribe", collection);
  } else {
    // documentId will be available here
    const document = await _models.Document.findByPk(documentId, {
      userId: user.id
    });
    (0, _policies.authorize)(user, "subscribe", document);
  }
  const subscription = await (0, _subscriptionCreator.default)({
    ctx,
    documentId,
    collectionId,
    event
  });
  ctx.body = {
    data: (0, _presenters.presentSubscription)(subscription)
  };
});
router.get("subscriptions.delete", (0, _validate.default)(T.SubscriptionsDeleteTokenSchema), (0, _rateLimiter.rateLimiter)(_RateLimiter.RateLimiterStrategy.FivePerMinute), (0, _transaction.transaction)(), async ctx => {
  const {
    transaction
  } = ctx.state;
  const {
    follow,
    userId,
    documentId,
    token
  } = ctx.input.query;

  // The link in the email does not include the follow query param, this
  // is to help prevent anti-virus, and email clients from pre-fetching the link
  if (!follow) {
    return ctx.redirectOnClient(ctx.request.href + "&follow=true");
  }
  const unsubscribeToken = _SubscriptionHelper.default.unsubscribeToken(userId, documentId);
  if (unsubscribeToken !== token) {
    ctx.redirect(`${_env.default.URL}?notice=invalid-auth`);
    return;
  }
  const [documentSubscription, document, user] = await Promise.all([_models.Subscription.findOne({
    where: {
      userId,
      documentId
    },
    lock: _sequelize.Transaction.LOCK.UPDATE,
    transaction
  }), _models.Document.unscoped().findOne({
    attributes: ["collectionId"],
    where: {
      id: documentId
    },
    paranoid: false,
    transaction
  }), _models.User.scope("withTeam").findByPk(userId, {
    rejectOnEmpty: true,
    transaction
  })]);
  const context = (0, _context.createContext)({
    user,
    ip: ctx.request.ip,
    transaction
  });
  const collectionSubscription = document?.collectionId ? await _models.Subscription.findOne({
    where: {
      userId,
      collectionId: document.collectionId
    },
    lock: _sequelize.Transaction.LOCK.UPDATE,
    transaction
  }) : undefined;
  if (collectionSubscription) {
    (0, _policies.authorize)(user, "delete", collectionSubscription);
    await collectionSubscription.destroyWithCtx(context);
  }
  if (documentSubscription) {
    (0, _policies.authorize)(user, "delete", documentSubscription);
    await documentSubscription.destroyWithCtx(context);
  }
  ctx.redirect(`${user.team.url}/home?notice=${collectionSubscription ? _types.QueryNotices.UnsubscribeCollection : documentSubscription ? _types.QueryNotices.UnsubscribeDocument : ""}`);
});
router.post("subscriptions.delete", (0, _authentication.default)(), (0, _validate.default)(T.SubscriptionsDeleteSchema), (0, _transaction.transaction)(), async ctx => {
  const {
    transaction
  } = ctx.state;
  const {
    user
  } = ctx.state.auth;
  const {
    id
  } = ctx.input.body;
  const subscription = await _models.Subscription.findByPk(id, {
    rejectOnEmpty: true,
    transaction
  });
  (0, _policies.authorize)(user, "delete", subscription);
  await subscription.destroyWithCtx(ctx);
  ctx.body = {
    success: true
  };
});
var _default = exports.default = router;