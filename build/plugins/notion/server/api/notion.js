"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _koaRouter = _interopRequireDefault(require("koa-router"));
var _types = require("./../../../../shared/types");
var _domains = require("./../../../../shared/utils/domains");
var _Logger = _interopRequireDefault(require("./../../../../server/logging/Logger"));
var _authentication = _interopRequireDefault(require("./../../../../server/middlewares/authentication"));
var _transaction = require("./../../../../server/middlewares/transaction");
var _validate = _interopRequireDefault(require("./../../../../server/middlewares/validate"));
var _models = require("./../../../../server/models");
var _notion = require("../notion");
var T = _interopRequireWildcard(require("./schema"));
var _NotionUtils = require("./../../shared/NotionUtils");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = new _koaRouter.default();
router.get("notion.callback", (0, _authentication.default)({
  optional: true
}), (0, _validate.default)(T.NotionCallbackSchema), (0, _transaction.transaction)(), async ctx => {
  const {
    code,
    state,
    error
  } = ctx.input.query;
  const {
    user
  } = ctx.state.auth;
  const {
    transaction
  } = ctx.state;
  let parsedState;
  try {
    parsedState = _NotionUtils.NotionUtils.parseState(state);
  } catch {
    ctx.redirect(_NotionUtils.NotionUtils.errorUrl("invalid_state"));
    return;
  }
  const {
    teamId
  } = parsedState;

  // This code block accounts for the root domain being unable to access authentication for subdomains.
  // We must forward to the appropriate subdomain to complete the oauth flow.
  if (!user) {
    if (teamId) {
      try {
        const team = await _models.Team.findByPk(teamId, {
          rejectOnEmpty: true,
          transaction
        });
        return (0, _domains.parseDomain)(ctx.host).teamSubdomain === team.subdomain ? ctx.redirect("/") : ctx.redirectOnClient(_NotionUtils.NotionUtils.callbackUrl({
          baseUrl: team.url,
          params: ctx.request.querystring
        }));
      } catch (err) {
        _Logger.default.error(`Error fetching team for teamId: ${teamId}!`, err);
        return ctx.redirect(_NotionUtils.NotionUtils.errorUrl("unauthenticated"));
      }
    } else {
      return ctx.redirect(_NotionUtils.NotionUtils.errorUrl("unauthenticated"));
    }
  }

  // Check error after any sub-domain redirection. Otherwise, the user will be redirected to the root domain.
  if (error) {
    ctx.redirect(_NotionUtils.NotionUtils.errorUrl(error));
    return;
  }

  // validation middleware ensures that code is non-null at this point.
  const data = await _notion.NotionClient.oauthAccess(code);
  const authentication = await _models.IntegrationAuthentication.create({
    service: _types.IntegrationService.Notion,
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token
  }, {
    transaction
  });
  const integration = await _models.Integration.create({
    service: _types.IntegrationService.Notion,
    type: _types.IntegrationType.Import,
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
    settings: {
      externalWorkspace: {
        id: data.workspace_id,
        name: data.workspace_name ?? "Notion import",
        iconUrl: data.workspace_icon ?? undefined
      }
    }
  }, {
    transaction
  });
  ctx.redirect(_NotionUtils.NotionUtils.successUrl(integration.id));
});
var _default = exports.default = router;