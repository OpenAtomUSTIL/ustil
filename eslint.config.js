import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      // 浏览器/Node 全局由 TypeScript 负责检查（tsconfig strict），eslint 不再重复
      'no-undef': 'off',
    },
  },
  {
    rules: {
      // 本项目组件文件名采用多词驼峰已满足，单文件视图允许单词命名关闭该规则
      'vue/multi-word-component-names': 'off',
      // v-html 内容均经 DOMPurify 消毒（见 src/utils/markdown.ts）
      'vue/no-v-html': 'off',
      // 格式类规则：本项目模板采用紧凑单行写法，与这两条强格式规则冲突
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
