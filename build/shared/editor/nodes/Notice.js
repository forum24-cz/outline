"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.NoticeTypes = void 0;
var _outlineIcons = require("outline-icons");
var _prosemirrorInputrules = require("prosemirror-inputrules");
var React = _interopRequireWildcard(require("react"));
var _reactDom = _interopRequireDefault(require("react-dom"));
var _toggleWrap = _interopRequireDefault(require("../commands/toggleWrap"));
var _notices = _interopRequireDefault(require("../rules/notices"));
var _Node = _interopRequireDefault(require("./Node"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
let NoticeTypes = exports.NoticeTypes = /*#__PURE__*/function (NoticeTypes) {
  NoticeTypes["Info"] = "info";
  NoticeTypes["Success"] = "success";
  NoticeTypes["Tip"] = "tip";
  NoticeTypes["Warning"] = "warning";
  return NoticeTypes;
}({});
class Notice extends _Node.default {
  constructor() {
    super(...arguments);
    _defineProperty(this, "handleStyleChange", (state, dispatch, style) => {
      const {
        tr,
        selection
      } = state;
      const {
        $from
      } = selection;
      const node = $from.node(-1);
      if (node?.type.name === this.name) {
        if (dispatch) {
          const transaction = tr.setNodeMarkup($from.before(-1), undefined, {
            ...node.attrs,
            style
          });
          dispatch(transaction);
        }
        return true;
      }
      return false;
    });
  }
  get name() {
    return "container_notice";
  }
  get rulePlugins() {
    return [_notices.default];
  }
  get schema() {
    return {
      attrs: {
        style: {
          default: NoticeTypes.Info
        }
      },
      content: "(list | blockquote | hr | paragraph | heading | code_block | code_fence | attachment)+",
      group: "block",
      defining: true,
      draggable: true,
      parseDOM: [{
        tag: "div.notice-block",
        preserveWhitespace: "full",
        contentElement: node => node.querySelector("div.content") || node,
        getAttrs: dom => ({
          style: dom.className.includes(NoticeTypes.Tip) ? NoticeTypes.Tip : dom.className.includes(NoticeTypes.Warning) ? NoticeTypes.Warning : dom.className.includes(NoticeTypes.Success) ? NoticeTypes.Success : undefined
        })
      },
      // Quill editor parsing
      {
        tag: "div.ql-hint",
        preserveWhitespace: "full",
        getAttrs: dom => ({
          style: dom.dataset.hint
        })
      },
      // GitBook parsing
      {
        tag: "div.alert.theme-admonition",
        preserveWhitespace: "full",
        getAttrs: dom => ({
          style: dom.className.includes(NoticeTypes.Warning) ? NoticeTypes.Warning : dom.className.includes(NoticeTypes.Success) ? NoticeTypes.Success : undefined
        })
      },
      // Confluence parsing
      {
        tag: "div.confluence-information-macro",
        preserveWhitespace: "full",
        getAttrs: dom => ({
          style: dom.className.includes("confluence-information-macro-tip") ? NoticeTypes.Success : dom.className.includes("confluence-information-macro-note") ? NoticeTypes.Tip : dom.className.includes("confluence-information-macro-warning") ? NoticeTypes.Warning : undefined
        })
      }],
      toDOM: node => {
        let icon;
        if (typeof document !== "undefined") {
          let component;
          if (node.attrs.style === NoticeTypes.Tip) {
            component = /*#__PURE__*/React.createElement(_outlineIcons.StarredIcon, null);
          } else if (node.attrs.style === NoticeTypes.Warning) {
            component = /*#__PURE__*/React.createElement(_outlineIcons.WarningIcon, null);
          } else if (node.attrs.style === NoticeTypes.Success) {
            component = /*#__PURE__*/React.createElement(_outlineIcons.DoneIcon, null);
          } else {
            component = /*#__PURE__*/React.createElement(_outlineIcons.InfoIcon, null);
          }
          icon = document.createElement("div");
          icon.className = "icon";
          _reactDom.default.render(component, icon);
        }
        return ["div", {
          class: `notice-block ${node.attrs.style}`
        }, ...(icon ? [icon] : []), ["div", {
          class: "content"
        }, 0]];
      }
    };
  }
  commands(_ref) {
    let {
      type
    } = _ref;
    return {
      container_notice: attrs => (0, _toggleWrap.default)(type, attrs),
      info: () => (state, dispatch) => this.handleStyleChange(state, dispatch, NoticeTypes.Info),
      warning: () => (state, dispatch) => this.handleStyleChange(state, dispatch, NoticeTypes.Warning),
      success: () => (state, dispatch) => this.handleStyleChange(state, dispatch, NoticeTypes.Success),
      tip: () => (state, dispatch) => this.handleStyleChange(state, dispatch, NoticeTypes.Tip)
    };
  }
  inputRules(_ref2) {
    let {
      type
    } = _ref2;
    return [(0, _prosemirrorInputrules.wrappingInputRule)(/^:::$/, type)];
  }
  toMarkdown(state, node) {
    state.write("\n:::" + (node.attrs.style || "info") + "\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write(":::");
    state.closeBlock(node);
  }
  parseMarkdown() {
    return {
      block: "container_notice",
      getAttrs: tok => ({
        style: tok.info
      })
    };
  }
}
exports.default = Notice;