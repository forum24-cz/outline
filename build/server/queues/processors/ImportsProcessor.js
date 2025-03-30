"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.PagePerImportTask = void 0;
var _fractionalIndex = _interopRequireDefault(require("fractional-index"));
var _chunk = _interopRequireDefault(require("lodash/chunk"));
var _keyBy = _interopRequireDefault(require("lodash/keyBy"));
var _truncate = _interopRequireDefault(require("lodash/truncate"));
var _prosemirrorModel = require("prosemirror-model");
var _uuid = require("uuid");
var _random = require("./../../../shared/random");
var _types = require("./../../../shared/types");
var _collections = require("./../../../shared/utils/collections");
var _validations = require("./../../../shared/validations");
var _collectionDestroyer = _interopRequireDefault(require("./../../commands/collectionDestroyer"));
var _context = require("./../../context");
var _editor = require("./../../editor");
var _Logger = _interopRequireDefault(require("./../../logging/Logger"));
var _models = require("./../../models");
var _ImportTask = _interopRequireDefault(require("./../../models/ImportTask"));
var _DocumentHelper = require("./../../models/helpers/DocumentHelper");
var _ProsemirrorHelper = require("./../../models/helpers/ProsemirrorHelper");
var _database = require("./../../storage/database");
var _BaseProcessor = _interopRequireDefault(require("./BaseProcessor"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const PagePerImportTask = exports.PagePerImportTask = 3;
class ImportsProcessor extends _BaseProcessor.default {
  /**
   * Run the import processor.
   *
   * @param event The import event
   */
  async perform(event) {
    try {
      await _database.sequelize.transaction(async transaction => {
        const importModel = await _models.Import.findByPk(event.modelId, {
          rejectOnEmpty: true,
          paranoid: false,
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!this.canProcess(importModel) || importModel.state === _types.ImportState.Errored || importModel.state === _types.ImportState.Canceled) {
          return;
        }
        switch (event.name) {
          case "imports.create":
            return this.onCreation(importModel, transaction);
          case "imports.processed":
            return this.onProcessed(importModel, transaction);
          case "imports.delete":
            return this.onDeletion(importModel, event, transaction);
        }
      });
    } catch (err) {
      if (event.name !== "imports.delete" && err instanceof Error) {
        const importModel = await _models.Import.findByPk(event.modelId, {
          rejectOnEmpty: true,
          paranoid: false
        });
        importModel.error = (0, _truncate.default)(err.message, {
          length: 255
        });
        await importModel.save();
      }
      throw err; // throw error for retry.
    }
  }
  async onFailed(event) {
    await _database.sequelize.transaction(async transaction => {
      const importModel = await _models.Import.findByPk(event.modelId, {
        rejectOnEmpty: true
      });
      importModel.state = _types.ImportState.Errored;
      await importModel.saveWithCtx((0, _context.createContext)({
        user: importModel.createdBy,
        transaction
      }));
    });
  }

  /**
   * Handle "imports.create" event.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Promise that resolves when the creation flow setup is done.
   */
  async onCreation(importModel, transaction) {
    if (!importModel.input.length) {
      return;
    }
    const tasksInput = await this.buildTasksInput(importModel, transaction);
    const importTasks = await Promise.all((0, _chunk.default)(tasksInput, PagePerImportTask).map(input => {
      const attrs = {
        state: _types.ImportTaskState.Created,
        input,
        importId: importModel.id
      };
      return _ImportTask.default.create(attrs, {
        transaction
      });
    }));
    importModel.state = _types.ImportState.InProgress;
    await importModel.save({
      transaction
    });
    transaction.afterCommit(() => this.scheduleTask(importTasks[0]));
  }

  /**
   * Handle "imports.processed" event.
   * This event is received when all the tasks for the import has been completed.
   * This method is responsible for persisting the collections and documents associated with the import.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Promise that resolves when mapping and persistence is completed.
   */
  async onProcessed(importModel, transaction) {
    const {
      collections
    } = await this.createCollectionsAndDocuments({
      importModel,
      transaction
    });

    // Once all collections and documents are created, update collection's document structure.
    // This ensures the root documents have the whole subtree available in the structure.
    for (const collection of collections) {
      await _models.Document.unscoped().findAllInBatches({
        where: {
          parentDocumentId: null,
          collectionId: collection.id
        },
        order: [["createdAt", "DESC"], ["id", "ASC"]],
        transaction
      }, async documents => {
        for (const document of documents) {
          await collection.addDocumentToStructure(document, 0, {
            save: false,
            silent: true,
            transaction
          });
        }
      });
      await collection.save({
        silent: true,
        transaction
      });
    }
    importModel.state = _types.ImportState.Completed;
    importModel.error = null; // unset any error from previous attempts.
    await importModel.saveWithCtx((0, _context.createContext)({
      user: importModel.createdBy,
      transaction
    }));
  }

  /**
   * Handle "imports.delete" event.
   * This method is responsible for deleting the collections and documents associated with the import.
   *
   * @param importModel Import model associated with the event.
   * @param event Received event.
   * @param transaction Sequelize transaction.
   * @returns Promise that resolves when the collections and documents are deleted.
   */
  async onDeletion(importModel, event, transaction) {
    if (importModel.state !== _types.ImportState.Completed) {
      return;
    }
    const user = await _models.User.findByPk(event.actorId, {
      rejectOnEmpty: true,
      paranoid: false,
      transaction
    });
    const collections = await _models.Collection.findAll({
      transaction,
      lock: transaction.LOCK.UPDATE,
      where: {
        teamId: importModel.teamId,
        apiImportId: importModel.id
      }
    });
    for (const collection of collections) {
      _Logger.default.debug("processor", "Destroying collection created from import", {
        collectionId: collection.id
      });
      await (0, _collectionDestroyer.default)({
        collection,
        transaction,
        user,
        ip: event.ip
      });
    }
  }

  /**
   * Create collections and documents associated with the import.
   *
   * @param importModel Import model associated with the event.
   * @param transaction Sequelize transaction.
   * @returns Promise of collection models that are created.
   */
  async createCollectionsAndDocuments(_ref) {
    let {
      importModel,
      transaction
    } = _ref;
    const now = new Date();
    const createdCollections = [];
    // External id to internal model id.
    const idMap = {};
    // These will be imported as collections.
    const importInput = (0, _keyBy.default)(importModel.input, "externalId");
    const ctx = (0, _context.createContext)({
      user: importModel.createdBy,
      transaction
    });
    const firstCollection = await _models.Collection.findFirstCollectionForUser(importModel.createdBy, {
      attributes: ["index"],
      transaction
    });
    let collectionIdx = firstCollection?.index ?? null;
    await _ImportTask.default.findAllInBatches({
      where: {
        importId: importModel.id
      },
      order: [["createdAt", "ASC"], ["id", "ASC"] // for stable order when multiple tasks have same "createdAt" value.
      ],
      // ordering ensures collections are created first.
      batchLimit: 5,
      // output data per task could be huge, keep a low batch size to prevent OOM.
      transaction
    }, async importTasks => {
      for (const importTask of importTasks) {
        const outputMap = (0, _keyBy.default)(importTask.output ?? [], "externalId");
        for (const input of importTask.input) {
          const externalId = input.externalId;
          const internalId = this.getInternalId(externalId, idMap);
          const parentExternalId = input.parentExternalId;
          const parentInternalId = parentExternalId ? this.getInternalId(parentExternalId, idMap) : undefined;
          const collectionExternalId = input.collectionExternalId;
          const collectionInternalId = collectionExternalId ? this.getInternalId(collectionExternalId, idMap) : undefined;
          const output = outputMap[externalId];
          const collectionItem = importInput[externalId];
          const attachments = await _models.Attachment.findAll({
            attributes: ["id", "size"],
            where: {
              documentId: externalId
            },
            // This will be set for root pages too (which will be imported as collection)
            transaction
          });
          const transformedContent = this.updateMentionsAndAttachments({
            content: output.content,
            attachments,
            importInput,
            idMap,
            actorId: importModel.createdById
          });
          if (collectionItem) {
            // imported collection will be placed in the beginning.
            collectionIdx = (0, _fractionalIndex.default)(null, collectionIdx);
            const description = _DocumentHelper.DocumentHelper.toMarkdown(transformedContent, {
              includeTitle: false
            });
            const collection = _models.Collection.build({
              id: internalId,
              name: output.title,
              icon: output.emoji ?? "collection",
              color: output.emoji ? undefined : (0, _random.randomElement)(_collections.colorPalette),
              content: transformedContent,
              description: (0, _truncate.default)(description, {
                length: _validations.CollectionValidation.maxDescriptionLength
              }),
              createdById: importModel.createdById,
              teamId: importModel.createdBy.teamId,
              apiImportId: importModel.id,
              index: collectionIdx,
              sort: _models.Collection.DEFAULT_SORT,
              permission: collectionItem.permission,
              createdAt: output.createdAt ?? now,
              updatedAt: output.updatedAt ?? now
            });
            await collection.saveWithCtx(ctx, {
              silent: true
            }, {
              name: "create",
              data: {
                name: output.title,
                source: "import"
              }
            });
            createdCollections.push(collection);

            // Unset documentId for attachments in collection overview.
            await _models.Attachment.update({
              documentId: null
            }, {
              where: {
                documentId: externalId
              },
              silent: true,
              transaction
            });
            continue;
          }

          // Document at the root of a collection when there's no parent (or) the parent is the collection.
          const isRootDocument = !parentExternalId || !!importInput[parentExternalId];
          const document = _models.Document.build({
            id: internalId,
            title: output.title,
            icon: output.emoji,
            content: transformedContent,
            text: _DocumentHelper.DocumentHelper.toMarkdown(transformedContent, {
              includeTitle: false
            }),
            collectionId: collectionInternalId,
            parentDocumentId: isRootDocument ? undefined : parentInternalId,
            createdById: importModel.createdById,
            lastModifiedById: importModel.createdById,
            teamId: importModel.createdBy.teamId,
            apiImportId: importModel.id,
            sourceMetadata: {
              externalId,
              externalName: output.title,
              createdByName: output.author
            },
            createdAt: output.createdAt ?? now,
            updatedAt: output.updatedAt ?? now,
            publishedAt: output.updatedAt ?? output.createdAt ?? now
          });
          await document.saveWithCtx(ctx, {
            silent: true
          }, {
            name: "create",
            data: {
              title: output.title,
              source: "import"
            }
          });

          // Update document id for attachments in document content.
          await _models.Attachment.update({
            documentId: internalId
          }, {
            where: {
              documentId: externalId
            },
            silent: true,
            transaction
          });
        }
      }
    });
    return {
      collections: createdCollections
    };
  }

  /**
   * Transform the mentions and attachments in ProseMirrorDoc to their internal references.
   *
   * @param content ProseMirrorDoc that represents collection (or) document content.
   * @param attachments Array of attachment models created for the import.
   * @param idMap Map of internalId to externalId.
   * @param importInput Contains the root externalId and associated info which were used to create the import.
   * @param actorId ID of the user who created the import.
   * @returns Updated ProseMirrorDoc.
   */
  updateMentionsAndAttachments(_ref2) {
    let {
      content,
      attachments,
      idMap,
      importInput,
      actorId
    } = _ref2;
    // special case when the doc content is empty
    if (!content.content.length) {
      return content;
    }
    const attachmentsMap = (0, _keyBy.default)(attachments, "id");
    const doc = _ProsemirrorHelper.ProsemirrorHelper.toProsemirror(content);
    const transformMentionNode = node => {
      const json = node.toJSON();
      const attrs = json.attrs ?? {};
      attrs.id = (0, _uuid.v4)();
      attrs.actorId = actorId;
      const externalId = attrs.modelId;
      attrs.modelId = this.getInternalId(externalId, idMap);
      const isCollectionMention = !!importInput[externalId]; // the referenced externalId is a root page.
      attrs.type = isCollectionMention ? _types.MentionType.Collection : _types.MentionType.Document;
      json.attrs = attrs;
      return _prosemirrorModel.Node.fromJSON(_editor.schema, json);
    };
    const transformAttachmentNode = node => {
      const json = node.toJSON();
      const attrs = json.attrs ?? {};
      attrs.size = attachmentsMap[attrs.id].size;
      json.attrs = attrs;
      return _prosemirrorModel.Node.fromJSON(_editor.schema, json);
    };
    const transformFragment = fragment => {
      const nodes = [];
      fragment.forEach(node => {
        nodes.push(node.type.name === "mention" ? transformMentionNode(node) : node.type.name === "attachment" ? transformAttachmentNode(node) : node.copy(transformFragment(node.content)));
      });
      return _prosemirrorModel.Fragment.fromArray(nodes);
    };
    return doc.copy(transformFragment(doc.content)).toJSON();
  }

  /**
   * Get internalId for the given externalId.
   * Returned internalId will be used as "id" for collections and documents created in the import.
   *
   * @param externalId externalId from a source.
   * @param idMap Map of internalId to externalId.
   * @returns Mapped internalId.
   */
  getInternalId(externalId, idMap) {
    const internalId = idMap[externalId] ?? (0, _uuid.v4)();
    idMap[externalId] = internalId;
    return internalId;
  }

  /**
   * Determine whether this import can be processed by this processor.
   *
   * @param importModel Import model associated with the import.
   * @returns boolean.
   */

  /**
   * Build task inputs which will be used for `APIImportTask`s.
   *
   * @param importInput Array of root externalId and associated info which were used to create the import.
   * @returns `ImportTaskInput`.
   */

  /**
   * Schedule the first `APIImportTask` for the import.
   *
   * @param importTask ImportTask model associated with the `APIImportTask`.
   * @returns Promise that resolves when the task is scheduled.
   */
}
exports.default = ImportsProcessor;
_defineProperty(ImportsProcessor, "applicableEvents", ["imports.create", "imports.processed", "imports.delete"]);