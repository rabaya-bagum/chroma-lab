// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Reanimated shared values are written with `.value =`, which this rule reports as a mutation.
      'react-hooks/immutability': 'off',
    },
  },
  {
    // Plain Node scripts (CommonJS) run outside Metro.
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', require: 'readonly', process: 'readonly', console: 'readonly', module: 'writable' },
    },
  },
  { ignores: ['dist/*', 'public/*', '.expo/*'] },
]);
