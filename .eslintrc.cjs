module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script",
  },
  rules: {
    eqeqeq: ["error", "always"],
    "no-undef": "error",
    "no-shadow": "error",
    "no-unused-vars": ["error", { args: "after-used", argsIgnorePattern: "^_" }],
    "no-implied-eval": "error",
    "no-global-assign": "error",
  },
};
