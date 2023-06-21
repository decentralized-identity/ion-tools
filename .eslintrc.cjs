module.exports = {
  parser: '@babel/eslint-parser', // For supporting "import assert" syntax (see: https://github.com/eslint/eslint/discussions/15305)
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      plugins: [
        '@babel/plugin-syntax-import-assertions'
      ],
    },
  },
  env: {
    node: true, // Enable Node.js global variables
    browser: true
  },
  rules: {
    'linebreak-style': [
      'error',
      'unix'
    ],
    'curly': [ 'error', 'all' ],
    'quotes': [
      'error',
      'single',
      { 'allowTemplateLiterals': true }
    ],
    'semi': [ 'error', 'always' ],
    'no-trailing-spaces': [ 'error' ],
    'no-unused-vars': [
      'error',
      {
        'vars': 'all',
        'args': 'after-used',
        'ignoreRestSiblings': true,
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }
    ],
    'array-bracket-spacing': [ 'error', 'always' ],
    'object-curly-spacing': [ 'error', 'always' ]
  }
};