"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EventBoundary is a component that prevents events from propagating to parent elements.
 * This is useful for preventing clicks or other interactions from bubbling up the DOM tree.
 */
const EventBoundary = _ref => {
  let {
    children,
    className,
    captureEvents = "all"
  } = _ref;
  const stopEvent = React.useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  let props = {};
  if (captureEvents === "all" || captureEvents === "pointer") {
    props = {
      onPointerDown: stopEvent,
      onPointerUp: stopEvent
    };
  }
  if (captureEvents === "all" || captureEvents === "click") {
    props = {
      ...props,
      onClick: stopEvent
    };
  }
  return /*#__PURE__*/React.createElement("span", _extends({}, props, {
    className: className
  }), children);
};
var _default = exports.default = EventBoundary;