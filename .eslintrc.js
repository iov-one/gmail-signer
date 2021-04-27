module.exports = {
  plugins: ["import", "simple-import-sort"],
  parser: "esprima",
  env: {
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  rules: {
    "no-empty": "off",
    "no-console": [
      "warn",
      {
        allow: ["error", "info", "warn"],
      },
    ],
    "no-param-reassign": "warn",
    "prefer-const": "warn",
    "sort-imports": "off", // we use the simple-import-sort plugin instead
    "spaced-comment": [
      "warn",
      "always",
      { line: { markers: ["/ <reference"] } },
    ],
    "simple-import-sort/imports": "error",

  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2018,
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
      },
      plugins: ["@typescript-eslint", "import", "simple-import-sort"],
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "prettier/@typescript-eslint",
      ],
      rules: {
        "@typescript-eslint/explicit-function-return-type": [
          "error",
          {
            allowExpressions: true,
          },
        ],
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      },
      settings: {
        "import/parsers": {
          "@typescript-eslint/parser": [".ts", ".tsx"]
        },
        "import/resolver": {
          typescript: {
            alwaysTryTypes: true,
            project: "./tsconfig.json",
          },
        },
      },
    },
  ],
};
