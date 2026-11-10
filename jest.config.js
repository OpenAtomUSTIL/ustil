module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
  // uuid@13 为纯 ESM，交由 ts-jest 转成 CJS，保证任意 Node 版本可跑测试
  transformIgnorePatterns: ['/node_modules/(?!uuid)(?!.pnpm/uuid@)'],
};
