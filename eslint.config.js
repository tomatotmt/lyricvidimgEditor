import {config as remotion} from '@remotion/eslint-config-flat';

export default [
  ...remotion,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
