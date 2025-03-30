"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setRecentCodeLanguage = exports.getRecentCodeLanguage = exports.getPrismLangForLanguage = exports.getLabelForLanguage = exports.getFrequentCodeLanguages = exports.codeLanguages = void 0;
var _Storage = _interopRequireDefault(require("../../utils/Storage"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const RecentStorageKey = "rme-code-language";
const StorageKey = "frequent-code-languages";
const frequentLanguagesToGet = 5;
const frequentLanguagesToTrack = 10;

/**
 * List of supported code languages.
 *
 * Object key is the language identifier used in the editor, lang is the
 * language identifier used by Prism. Note mismatches such as `markup` and
 * `mermaid`.
 */
const codeLanguages = exports.codeLanguages = {
  none: {
    lang: "",
    label: "Plain text"
  },
  bash: {
    lang: "bash",
    label: "Bash"
  },
  clike: {
    lang: "clike",
    label: "C"
  },
  cpp: {
    lang: "cpp",
    label: "C++"
  },
  csharp: {
    lang: "csharp",
    label: "C#"
  },
  css: {
    lang: "css",
    label: "CSS"
  },
  docker: {
    lang: "docker",
    label: "Docker"
  },
  elixir: {
    lang: "elixir",
    label: "Elixir"
  },
  erlang: {
    lang: "erlang",
    label: "Erlang"
  },
  go: {
    lang: "go",
    label: "Go"
  },
  graphql: {
    lang: "graphql",
    label: "GraphQL"
  },
  groovy: {
    lang: "groovy",
    label: "Groovy"
  },
  haskell: {
    lang: "haskell",
    label: "Haskell"
  },
  hcl: {
    lang: "hcl",
    label: "HCL"
  },
  markup: {
    lang: "markup",
    label: "HTML"
  },
  ini: {
    lang: "ini",
    label: "INI"
  },
  java: {
    lang: "java",
    label: "Java"
  },
  javascript: {
    lang: "javascript",
    label: "JavaScript"
  },
  json: {
    lang: "json",
    label: "JSON"
  },
  jsx: {
    lang: "jsx",
    label: "JSX"
  },
  kotlin: {
    lang: "kotlin",
    label: "Kotlin"
  },
  lisp: {
    lang: "lisp",
    label: "Lisp"
  },
  lua: {
    lang: "lua",
    label: "Lua"
  },
  mermaidjs: {
    lang: "mermaid",
    label: "Mermaid Diagram"
  },
  nginx: {
    lang: "nginx",
    label: "Nginx"
  },
  nix: {
    lang: "nix",
    label: "Nix"
  },
  objectivec: {
    lang: "objectivec",
    label: "Objective-C"
  },
  ocaml: {
    lang: "ocaml",
    label: "OCaml"
  },
  perl: {
    lang: "perl",
    label: "Perl"
  },
  php: {
    lang: "php",
    label: "PHP"
  },
  powershell: {
    lang: "powershell",
    label: "Powershell"
  },
  protobuf: {
    lang: "protobuf",
    label: "Protobuf"
  },
  python: {
    lang: "python",
    label: "Python"
  },
  r: {
    lang: "r",
    label: "R"
  },
  ruby: {
    lang: "ruby",
    label: "Ruby"
  },
  rust: {
    lang: "rust",
    label: "Rust"
  },
  scala: {
    lang: "scala",
    label: "Scala"
  },
  sass: {
    lang: "sass",
    label: "Sass"
  },
  scss: {
    lang: "scss",
    label: "SCSS"
  },
  sql: {
    lang: "sql",
    label: "SQL"
  },
  solidity: {
    lang: "solidity",
    label: "Solidity"
  },
  swift: {
    lang: "swift",
    label: "Swift"
  },
  toml: {
    lang: "toml",
    label: "TOML"
  },
  tsx: {
    lang: "tsx",
    label: "TSX"
  },
  typescript: {
    lang: "typescript",
    label: "TypeScript"
  },
  vb: {
    lang: "vb",
    label: "Visual Basic"
  },
  verilog: {
    lang: "verilog",
    label: "Verilog"
  },
  vhdl: {
    lang: "vhdl",
    label: "VHDL"
  },
  yaml: {
    lang: "yaml",
    label: "YAML"
  },
  xml: {
    lang: "markup",
    label: "XML"
  },
  zig: {
    lang: "zig",
    label: "Zig"
  }
};

/**
 * Get the human-readable label for a given language.
 *
 * @param language The language identifier.
 * @returns The human-readable label for the language.
 */
const getLabelForLanguage = language => {
  const lang = codeLanguages[language] ?? codeLanguages.none;
  return lang.label;
};

/**
 * Get the Prism language identifier for a given language.
 *
 * @param language The language identifier.
 * @returns The Prism language identifier for the language.
 */
exports.getLabelForLanguage = getLabelForLanguage;
const getPrismLangForLanguage = language => codeLanguages[language]?.lang;

/**
 * Set the most recent code language used.
 *
 * @param language The language identifier.
 */
exports.getPrismLangForLanguage = getPrismLangForLanguage;
const setRecentCodeLanguage = language => {
  const frequentLangs = _Storage.default.get(StorageKey) ?? {};
  if (Object.keys(frequentLangs).length === 0) {
    const lastUsedLang = _Storage.default.get(RecentStorageKey);
    if (lastUsedLang) {
      frequentLangs[lastUsedLang] = 1;
    }
  }
  frequentLangs[language] = (frequentLangs[language] ?? 0) + 1;
  const frequentLangEntries = Object.entries(frequentLangs);
  if (frequentLangEntries.length > frequentLanguagesToTrack) {
    sortFrequencies(frequentLangEntries);
    const lastEntry = frequentLangEntries[frequentLanguagesToTrack];
    if (lastEntry[0] === language) {
      frequentLangEntries.splice(frequentLanguagesToTrack - 1, 1);
    } else {
      frequentLangEntries.splice(frequentLanguagesToTrack);
    }
  }
  _Storage.default.set(StorageKey, Object.fromEntries(frequentLangEntries));
  _Storage.default.set(RecentStorageKey, language);
};

/**
 * Get the most recent code language used.
 *
 * @returns The most recent code language used, or undefined if none is set.
 */
exports.setRecentCodeLanguage = setRecentCodeLanguage;
const getRecentCodeLanguage = () => _Storage.default.get(RecentStorageKey);

/**
 * Get the most frequent code languages used.
 *
 * @returns An array of the most frequent code languages used.
 */
exports.getRecentCodeLanguage = getRecentCodeLanguage;
const getFrequentCodeLanguages = () => {
  const recentLang = _Storage.default.get(RecentStorageKey);
  const frequentLangEntries = Object.entries(_Storage.default.get(StorageKey) ?? {});
  const frequentLangs = sortFrequencies(frequentLangEntries).slice(0, frequentLanguagesToGet).map(_ref => {
    let [lang] = _ref;
    return lang;
  });
  const isRecentLangPresent = frequentLangs.includes(recentLang);
  if (recentLang && !isRecentLangPresent) {
    frequentLangs.pop();
    frequentLangs.push(recentLang);
  }
  return frequentLangs;
};
exports.getFrequentCodeLanguages = getFrequentCodeLanguages;
const sortFrequencies = freqs => freqs.sort((a, b) => a[1] >= b[1] ? -1 : 1);