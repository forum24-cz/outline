"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FileHelper = _interopRequireDefault(require("./../../../shared/editor/lib/FileHelper"));
var _urls = require("./../../../shared/utils/urls");
var _env = _interopRequireDefault(require("./../../env"));
var _Logger = _interopRequireDefault(require("./../../logging/Logger"));
var _fetch = _interopRequireWildcard(require("./../../utils/fetch"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
class BaseStorage {
  constructor() {
    /**
     * A list of content types considered safe to display inline in the browser.
     * Note that SVGs are purposefully not included here as they can contain JS.
     */
    _defineProperty(this, "safeInlineContentTypes", ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);
  }
  /**
   * Returns a presigned post for uploading files to the storage provider.
   *
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @param maxUploadSize The maximum upload size in bytes
   * @param contentType The content type of the file
   * @returns The presigned post object to use on the client (TODO: Abstract away from S3)
   */
  /**
   * Returns a promise that resolves with a stream for reading a file from the storage provider.
   *
   * @param key The path to the file
   */
  /**
   * Returns the upload URL for the storage provider.
   *
   * @param isServerUpload Whether the upload is happening on the server or not
   * @returns {string} The upload URL
   */
  /**
   * Returns the download URL for a given file.
   *
   * @param key The path to the file
   * @returns {string} The download URL for the file
   */
  /**
   * Returns a signed URL for a file from the storage provider.
   *
   * @param key The path to the file
   * @param expiresIn An optional number of seconds until the URL expires
   */
  /**
   * Store a file in the storage provider.
   *
   * @param body The file body
   * @param contentLength The content length of the file
   * @param contentType The content type of the file
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @returns The URL of the file
   */
  /**
   * Returns a file handle for a file from the storage provider.
   *
   * @param key The path to the file
   * @returns The file path and a cleanup function
   */
  /**
   * Returns a promise that resolves to a buffer of a file from the storage provider.
   *
   * @param key The path to the file
   * @returns A promise that resolves with the file buffer
   */
  async getFileBuffer(key) {
    const stream = await this.getFileStream(key);
    return new Promise((resolve, reject) => {
      const chunks = [];
      if (!stream) {
        return reject(new Error("No stream available"));
      }
      stream.on("data", d => {
        chunks.push(d);
      });
      stream.once("end", () => {
        resolve(Buffer.concat(chunks));
      });
      stream.once("error", reject);
    });
  }

  /**
   * Upload a file to the storage provider directly from a remote or base64 encoded URL.
   *
   * @param url The URL to upload from
   * @param key The path to store the file at
   * @param acl The ACL to use
   * @param init Optional fetch options to use
   * @param options Optional upload options
   * @returns A promise that resolves when the file is uploaded
   */
  async storeFromUrl(url, key, acl, init, options) {
    const endpoint = this.getUploadUrl(true);

    // Early return if url is already uploaded to the storage provider
    if (url.startsWith(endpoint) || (0, _urls.isInternalUrl)(url)) {
      return;
    }
    let buffer, contentType;
    const match = (0, _urls.isBase64Url)(url);
    if (match) {
      contentType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      try {
        const res = await (0, _fetch.default)(url, {
          follow: 3,
          redirect: "follow",
          size: Math.min(options?.maxUploadSize ?? Infinity, _env.default.FILE_STORAGE_UPLOAD_MAX_SIZE),
          headers: {
            "User-Agent": _fetch.chromeUserAgent
          },
          timeout: 10000,
          ...init
        });
        if (!res.ok) {
          throw new Error(`Error fetching URL to upload: ${res.status}`);
        }
        buffer = await res.buffer();
        contentType = res.headers.get("content-type") ?? "application/octet-stream";
      } catch (err) {
        _Logger.default.warn("Error fetching URL to upload", {
          error: err.message,
          url,
          key,
          acl
        });
        return;
      }
    }
    const contentLength = buffer.byteLength;
    if (contentLength === 0) {
      return;
    }
    try {
      const result = await this.store({
        body: buffer,
        contentType,
        key,
        acl
      });
      return result ? {
        url: result,
        contentLength,
        contentType
      } : undefined;
    } catch (err) {
      _Logger.default.error("Error uploading to file storage from URL", err, {
        url,
        key,
        acl
      });
      return;
    }
  }

  /**
   * Delete a file from the storage provider.
   *
   * @param key The path to the file
   * @returns A promise that resolves when the file is deleted
   */

  /**
   * Returns the content disposition for a given content type.
   *
   * @param contentType The content type
   * @returns The content disposition
   */
  getContentDisposition(contentType) {
    if (!contentType) {
      return "attachment";
    }
    if (_FileHelper.default.isAudio(contentType) || _FileHelper.default.isVideo(contentType) || this.safeInlineContentTypes.includes(contentType)) {
      return "inline";
    }
    return "attachment";
  }
}
exports.default = BaseStorage;
/** The default number of seconds until a signed URL expires. */
_defineProperty(BaseStorage, "defaultSignedUrlExpires", 60);