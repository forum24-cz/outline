import{aM as r,n,C as e,aN as t,j as s}from"./index.mlCxaiYE.js";function replace(r,n,e,t){if("string"!=typeof r)throw new Error("First param must be a string");if("string"!=typeof n&&!(n instanceof RegExp))throw new Error("Second param must be a string pattern or a regular expression");return("string"==typeof n?replaceUsingString:replaceUsingRegexp)(r,n,e,t)}function replaceUsingString(r,n,e,t){var s=r.indexOf(n);if(s>=0){var i=[],a=s+n.length;return s>0&&i.push(r.substring(0,s)),i.push("function"==typeof e?e(r.substring(s,a),s+t,r):e),a<r.length&&i.push(r.substring(a)),i}return[r]}function replaceUsingRegexp(r,n,e,t){var s,i=[],a="function"==typeof e,g=n.lastIndex;n.lastIndex=0;for(var o=0;s=n.exec(r);){var p=s.index;""===s[0]&&n.lastIndex++,p!==o&&i.push(r.substring(o,p)),o=p+s[0].length;var u=a?e.apply(this,s.concat(p+t,s.input)):e;if(i.push(u),!n.global)break}return o<r.length&&i.push(r.substring(o)),n.lastIndex=g,i}const i=r((function stringReplaceToArray2(r,n,e){if("string"==typeof r)return replace(r,n,e,0);if(Array.isArray(r)&&r[0]){for(var t=r.length,s=[],i=0,a=0;a<t;++a){var g=r[a];"string"==typeof g?(s.push.apply(s,replace(g,n,e,i)),i+=g.length):s.push(g)}return s}throw new TypeError("First argument must be an array or non-empty string")}));function Highlight({highlight:r,processResult:n,caseSensitive:e,text:g="",...o}){let p,u=0;return p=r instanceof RegExp?r:new RegExp(t(r||""),e?"g":"gi"),s("span",{...o,children:r?i(g,p,(r=>s(a,{children:n?n(r):r},u++))):g})}const a=n.mark.withConfig({componentId:"sc-1km5n0v-0"})(["color:",";background:transparent;font-weight:600;"],e("text"));export{Highlight as H,a as M};
