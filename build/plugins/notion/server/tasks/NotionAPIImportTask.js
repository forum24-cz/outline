"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _ProsemirrorHelper = require("./../../../../shared/utils/ProsemirrorHelper");
var _models = require("./../../../../server/models");
var _APIImportTask = _interopRequireDefault(require("./../../../../server/queues/tasks/APIImportTask"));
var _types = require("../../shared/types");
var _notion = require("../notion");
var _NotionConverter = require("../utils/NotionConverter");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class NotionAPIImportTask extends _APIImportTask.default {
  /**
   * Process the Notion import task.
   * This fetches data from Notion and converts it to task output.
   *
   * @param importTask ImportTask model to process.
   * @returns Promise with output that resolves once processing has completed.
   */
  async process(importTask) {
    const integration = await _models.Integration.scope("withAuthentication").findByPk(importTask.import.integrationId, {
      rejectOnEmpty: true
    });
    const client = new _notion.NotionClient(integration.authentication.token);
    const parsedPages = await Promise.all(importTask.input.map(async item => this.processPage({
      item,
      client
    })));
    const taskOutput = parsedPages.map(parsedPage => ({
      externalId: parsedPage.externalId,
      title: parsedPage.title,
      emoji: parsedPage.emoji,
      content: parsedPage.content,
      author: parsedPage.author,
      createdAt: parsedPage.createdAt,
      updatedAt: parsedPage.updatedAt
    }));
    const childTasksInput = parsedPages.flatMap(parsedPage => parsedPage.children.map(childPage => ({
      type: childPage.type,
      externalId: childPage.externalId,
      parentExternalId: parsedPage.externalId,
      collectionExternalId: parsedPage.collectionExternalId
    })));
    return {
      taskOutput,
      childTasksInput
    };
  }

  /**
   * Schedule the next `NotionAPIImportTask`.
   *
   * @param importTask ImportTask model associated with the `NotionAPIImportTask`.
   * @returns Promise that resolves when the task is scheduled.
   */
  async scheduleNextTask(importTask) {
    await NotionAPIImportTask.schedule({
      importTaskId: importTask.id
    });
    return;
  }

  /**
   * Fetch page data from Notion and convert it to expected output.
   *
   * @param item Object containing data about a notion page (or) database.
   * @param client Notion client.
   * @returns Promise of parsed page output that resolves when the task is scheduled.
   */
  async processPage(_ref) {
    let {
      item,
      client
    } = _ref;
    const collectionExternalId = item.collectionExternalId ?? item.externalId;

    // Convert Notion database to an empty page with "pages in database" as its children.
    if (item.type === _types.PageType.Database) {
      const {
        pages,
        ...databaseInfo
      } = await client.fetchDatabase(item.externalId);
      return {
        ...databaseInfo,
        externalId: item.externalId,
        content: _ProsemirrorHelper.ProsemirrorHelper.getEmptyDocument(),
        collectionExternalId,
        children: pages.map(page => ({
          type: page.type,
          externalId: page.id
        }))
      };
    }
    const {
      blocks,
      ...pageInfo
    } = await client.fetchPage(item.externalId);
    return {
      ...pageInfo,
      externalId: item.externalId,
      content: _NotionConverter.NotionConverter.page({
        children: blocks
      }),
      collectionExternalId,
      children: this.parseChildPages(blocks)
    };
  }

  /**
   * Parse Notion page blocks to get its child pages and databases.
   *
   * @param pageBlocks Array of blocks representing the page's content.
   * @returns Array containing child page and child database info.
   */
  parseChildPages(pageBlocks) {
    const childPages = [];
    pageBlocks.forEach(block => {
      if (block.type === "child_page") {
        childPages.push({
          type: _types.PageType.Page,
          externalId: block.id
        });
      } else if (block.type === "child_database") {
        childPages.push({
          type: _types.PageType.Database,
          externalId: block.id
        });
      } else if (block.children?.length) {
        childPages.push(...this.parseChildPages(block.children));
      }
    });
    return childPages;
  }
}
exports.default = NotionAPIImportTask;