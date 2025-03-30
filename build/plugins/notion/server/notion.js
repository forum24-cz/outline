"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotionClient = void 0;
var _client = require("@notionhq/client");
var _asyncSema = require("async-sema");
var _compact = _interopRequireDefault(require("lodash/compact"));
var _zod = require("zod");
var _time = require("./../../../shared/utils/time");
var _NotionUtils = require("../shared/NotionUtils");
var _types = require("../shared/types");
var _env = _interopRequireDefault(require("./env"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const Credentials = Buffer.from(`${_env.default.NOTION_CLIENT_ID}:${_env.default.NOTION_CLIENT_SECRET}`).toString("base64");
const AccessTokenResponseSchema = _zod.z.object({
  access_token: _zod.z.string(),
  bot_id: _zod.z.string(),
  workspace_id: _zod.z.string(),
  workspace_name: _zod.z.string().nullish(),
  workspace_icon: _zod.z.string().url().nullish()
});
class NotionClient {
  constructor(accessToken) {
    let rateLimit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      window: _time.Second.ms,
      limit: 3
    };
    _defineProperty(this, "client", void 0);
    _defineProperty(this, "limiter", void 0);
    _defineProperty(this, "pageSize", 25);
    this.client = new _client.Client({
      auth: accessToken
    });
    this.limiter = (0, _asyncSema.RateLimit)(rateLimit.limit, {
      timeUnit: rateLimit.window,
      uniformDistribution: true
    });
  }
  static async oauthAccess(code) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Credentials}`
    };
    const body = {
      grant_type: "authorization_code",
      code,
      redirect_uri: _NotionUtils.NotionUtils.callbackUrl()
    };
    const res = await fetch(_NotionUtils.NotionUtils.tokenUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    return AccessTokenResponseSchema.parse(await res.json());
  }
  async fetchRootPages() {
    const pages = [];
    let cursor;
    let hasMore = true;
    while (hasMore) {
      await this.limiter();
      const response = await this.client.search({
        start_cursor: cursor,
        page_size: this.pageSize
      });
      response.results.forEach(item => {
        if (!(0, _client.isFullPageOrDatabase)(item)) {
          return;
        }
        if (item.parent.type === "workspace") {
          pages.push({
            type: item.object === "page" ? _types.PageType.Page : _types.PageType.Database,
            id: item.id,
            name: this.parseTitle(item),
            emoji: this.parseEmoji(item)
          });
        }
      });
      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }
    return pages;
  }
  async fetchPage(pageId) {
    const pageInfo = await this.fetchPageInfo(pageId);
    const blocks = await this.fetchBlockChildren(pageId);
    return {
      ...pageInfo,
      blocks
    };
  }
  async fetchDatabase(databaseId) {
    const databaseInfo = await this.fetchDatabaseInfo(databaseId);
    const pages = await this.queryDatabase(databaseId);
    return {
      ...databaseInfo,
      pages
    };
  }
  async fetchBlockChildren(blockId) {
    const blocks = [];
    let cursor;
    let hasMore = true;
    while (hasMore) {
      await this.limiter();
      const response = await this.client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: this.pageSize
      });
      blocks.push(...response.results);
      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }

    // Recursive fetch when direct children have their own children.
    await Promise.all(blocks.map(async block => {
      if (block.has_children && block.type !== "child_page" && block.type !== "child_database") {
        block.children = await this.fetchBlockChildren(block.id);
      }
    }));
    return blocks;
  }
  async queryDatabase(databaseId) {
    const pages = [];
    let cursor;
    let hasMore = true;
    while (hasMore) {
      await this.limiter();
      const response = await this.client.databases.query({
        database_id: databaseId,
        filter_properties: ["title"],
        start_cursor: cursor,
        page_size: this.pageSize
      });
      const pagesFromRes = (0, _compact.default)(response.results.map(item => {
        if (!(0, _client.isFullPage)(item)) {
          return;
        }
        return {
          type: _types.PageType.Page,
          id: item.id,
          name: this.parseTitle(item),
          emoji: this.parseEmoji(item)
        };
      }));
      pages.push(...pagesFromRes);
      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }
    return pages;
  }
  async fetchPageInfo(pageId) {
    await this.limiter();
    const page = await this.client.pages.retrieve({
      page_id: pageId
    });
    const author = await this.fetchUsername(page.created_by.id);
    return {
      title: this.parseTitle(page),
      emoji: this.parseEmoji(page),
      author: author ?? undefined,
      createdAt: !page.created_time ? undefined : new Date(page.created_time),
      updatedAt: !page.last_edited_time ? undefined : new Date(page.last_edited_time)
    };
  }
  async fetchDatabaseInfo(databaseId) {
    await this.limiter();
    const database = await this.client.databases.retrieve({
      database_id: databaseId
    });
    const author = await this.fetchUsername(database.created_by.id);
    return {
      title: this.parseTitle(database),
      emoji: this.parseEmoji(database),
      author: author ?? undefined,
      createdAt: !database.created_time ? undefined : new Date(database.created_time),
      updatedAt: !database.last_edited_time ? undefined : new Date(database.last_edited_time)
    };
  }
  async fetchUsername(userId) {
    await this.limiter();
    try {
      const user = await this.client.users.retrieve({
        user_id: userId
      });
      if (user.type === "person" || !user.bot.owner) {
        return user.name;
      }

      // bot belongs to a user, get the user's name.
      if (user.bot.owner.type === "user" && (0, _client.isFullUser)(user.bot.owner.user)) {
        return user.bot.owner.user.name;
      }

      // bot belongs to a workspace, fallback to bot's name.
      return user.name;
    } catch (error) {
      // Handle the case where a user can't be found
      if (error instanceof _client.APIResponseError && error.code === _client.APIErrorCode.ObjectNotFound) {
        return "Unknown";
      }
      throw error;
    }
  }
  parseTitle(item) {
    let richTexts;
    if (item.object === "page") {
      const titleProp = Object.values(item.properties).find(property => property.type === "title");
      richTexts = titleProp?.title ?? [];
    } else {
      richTexts = item.title;
    }
    return richTexts.map(richText => richText.plain_text).join("");
  }
  parseEmoji(item) {
    // Other icon types return a url to download from, which we don't support.
    return item.icon?.type === "emoji" ? item.icon.emoji : undefined;
  }
}
exports.NotionClient = NotionClient;