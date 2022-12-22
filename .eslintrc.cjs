module.exports = {
  parserOptions: {
    ecmaVersion: 'latest', // Allows the use of modern ECMAScript features
    sourceType : 'module', // Allows for the use of imports
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
    'curly': ['error', 'all'],
    'quotes': [
      'error',
      'single',
      { 'allowTemplateLiterals': true }
    ],
    'semi': ['error', 'always'],
    'no-trailing-spaces': ['error'],
    'no-unused-vars': [
      'error',
      {
        'vars': 'all',
        'args': 'after-used',
        'ignoreRestSiblings': true,
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }
    ]
  }
};