const assert = require('node:assert/strict');
const { test } = require('node:test');
const esbuild = require('esbuild');

const { outputFiles } = esbuild.buildSync({
  entryPoints: ['src/wordGoalLogic.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
});
const logicModule = { exports: {} };
new Function('module', 'exports', outputFiles[0].text)(logicModule, logicModule.exports);
const { calculateProgressPercent, getWordGoalStatus } = logicModule.exports;

test('no limits produce no-goal status and no progress', () => {
  const goal = { min: 0, max: 0 };

  assert.equal(getWordGoalStatus(42, goal), 'no-goal');
  assert.equal(calculateProgressPercent(42, goal), 0);
});

test('minimum-only goals warn below the minimum and otherwise remain in range', () => {
  const goal = { min: 100, max: 0 };

  assert.equal(getWordGoalStatus(99, goal), 'below-minimum');
  assert.equal(getWordGoalStatus(100, goal), 'in-range');
  assert.equal(getWordGoalStatus(200, goal), 'in-range');
});

test('maximum-only goals retain maximum status and progress behavior', () => {
  const goal = { min: 0, max: 100 };

  assert.equal(getWordGoalStatus(50, goal), 'in-range');
  assert.equal(getWordGoalStatus(101, goal), 'over-maximum');
  assert.equal(calculateProgressPercent(50, goal), 50);
  assert.equal(calculateProgressPercent(150, goal), 100);
});

test('configured minimum and maximum both constrain the word count', () => {
  const goal = { min: 50, max: 100 };

  assert.equal(getWordGoalStatus(49, goal), 'below-minimum');
  assert.equal(getWordGoalStatus(75, goal), 'in-range');
  assert.equal(getWordGoalStatus(101, goal), 'over-maximum');
});
