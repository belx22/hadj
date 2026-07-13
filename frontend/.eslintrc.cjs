module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    // Autorise les variables/arguments préfixés par `_` (ex. `_pw` issu d'un
    // destructuring qui sert uniquement à écarter le mot de passe d'un objet).
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/*.test.{js,jsx}', 'src/test/**'],
      globals: {
        vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly',
      },
      // Les tableaux de cas de test ([label, <Page/>]) n'ont pas besoin de clés.
      rules: { 'react/jsx-key': 'off' },
    },
  ],
};
