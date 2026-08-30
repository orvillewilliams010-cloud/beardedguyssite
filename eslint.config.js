import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'js/**/*', 'css/**/*', 'assets/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
