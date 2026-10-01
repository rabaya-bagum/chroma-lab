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
  { ignores: ['dist/*', 'public/*', '.expo/*'] },
]);
