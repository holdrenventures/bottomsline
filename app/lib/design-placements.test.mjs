import assert from 'node:assert/strict';
import { test } from 'node:test';
import { colorPlacement, editColorPlacement } from './design-placements.mjs';

const defaults = { w: .34, x: 0, y: .3, angle: 0, brightness: 0 };

test('first placement flows to untouched colors, later individual changes stay independent', () => {
  const first = editColorPlacement(undefined, defaults, 'black', { w: .4, angle: 8 });
  assert.deepEqual(colorPlacement(first, defaults, 'white'), colorPlacement(first, defaults, 'black'));
  const second = editColorPlacement(first, defaults, 'white', { brightness: -10 });
  const third = editColorPlacement(second, defaults, 'black', { x: .1 });
  assert.equal(colorPlacement(third, defaults, 'navy').x, .1);
  assert.equal(colorPlacement(third, defaults, 'white').x, 0);
  assert.equal(colorPlacement(third, defaults, 'white').brightness, -10);
  assert.equal(colorPlacement(first, defaults, 'black').x, 0);
});

test('loaded explicit placements remain unchanged when another color is edited', () => {
  const loaded = { lead: 'black', base: { ...defaults }, colors: { black: { ...defaults }, white: { ...defaults, brightness: -20 } } };
  const edited = editColorPlacement(loaded, defaults, 'black', { w: .5 });
  assert.equal(colorPlacement(edited, defaults, 'white').w, .34);
  assert.equal(colorPlacement(edited, defaults, 'navy').w, .5);
});
