const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**"],
  },

  // Cấu hình chung cho mọi file JS (Node.js)
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-var": "error",
      "prefer-const": "warn",
      "no-console": "off",
      eqeqeq: ["warn", "always"],
    },
  },

  // Test files: thêm Jest globals
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // Frontend (public/): browser globals (document, window, fetch, localStorage, ...)
  // Dùng script tags không phải ES modules — config.js define `auth` global,
  // script.js sử dụng. ESLint không track cross-file globals tốt → tắt no-undef.
  {
    files: ["public/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
];
