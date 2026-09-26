const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores(['.expo/*', 'coverage/*', 'dist/*']),
  expoConfig,
  {
    files: ['app.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
