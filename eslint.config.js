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
    // A non-worklet called from a worklet aborts the app on the UI thread.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { worklets: require('./eslint/worklets') },
    rules: { 'worklets/no-js-call-in-worklet': 'error' },
  },
  {
    // Plain Node scripts (CommonJS) run outside Metro.
    files: ['scripts/**/*.js', 'eslint/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', require: 'readonly', process: 'readonly', console: 'readonly', module: 'writable' },
    },
  },
  { ignores: ['dist/*', 'public/*', '.expo/*'] },
]);
