"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TooManyConnections = exports.EditorUpdateError = exports.DocumentTooLarge = exports.AuthorizationFailed = exports.AuthenticationFailed = void 0;
const DocumentTooLarge = exports.DocumentTooLarge = {
  code: 1009,
  reason: "Document Too Large"
};
const AuthenticationFailed = exports.AuthenticationFailed = {
  code: 4401,
  reason: "Authentication Failed"
};
const AuthorizationFailed = exports.AuthorizationFailed = {
  code: 4403,
  reason: "Authorization Failed"
};
const TooManyConnections = exports.TooManyConnections = {
  code: 4503,
  reason: "Too Many Connections"
};
const EditorUpdateError = exports.EditorUpdateError = {
  code: 5000,
  reason: "Editor Update Required"
};