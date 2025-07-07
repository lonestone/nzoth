// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu(
  // Configures for antfu's config and global rules
  {
    ignores: [
      '**/*.gen.ts',
      '**/dist/',
      '**/temp/',
      '**/build/',
    ],
    rules: {
      'ts/interface-name-prefix': 'off',
      'ts/explicit-function-return-type': 'off',
      'ts/explicit-module-boundary-types': 'off',
      'ts/no-explicit-any': 'off',
    },
  }
)
