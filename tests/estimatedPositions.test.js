import test from 'node:test';
import assert from 'node:assert/strict';
import { projectionParts } from '../src/lib/estimatedPositions.js';

test('projected timing retains milliseconds and separates DNF notes for wrapping', () => {
  assert.deepEqual(projectionParts('12/3:46.587 (DNF)'), {time:'12 / 3:46.587',note:'(DNF)'});
  assert.deepEqual(projectionParts('11 / 4:04.123 (2 rounds)'), {time:'11 / 4:04.123',note:'(2 rounds)'});
  assert.deepEqual(projectionParts('17/5:02.123'), {time:'17 / 5:02.123',note:''});
});
test('missing and non-timing projections remain readable', () => {
  assert.deepEqual(projectionParts(null), {time:'-',note:''});
  assert.deepEqual(projectionParts('DNS'), {time:'DNS',note:''});
});
