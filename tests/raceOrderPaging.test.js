import test from 'node:test';
import assert from 'node:assert/strict';
import { raceOrderSpread } from '../src/lib/raceOrderPaging.js';
import { isFinalsRound } from '../src/lib/raceday.js';
const races = Array.from({length:23}, (_,index) => ({seq:index+1}));
const numbers = group => group.map(race => race.seq);

test('finals show consecutive pages and advance both halves together', () => {
  const first = raceOrderSpread(races,5,0,2);
  assert.equal(first.pageCount,3);
  assert.deepEqual(first.groups.map(numbers), [[1,2,3,4,5],[6,7,8,9,10]]);
  const second = raceOrderSpread(races,5,1,2);
  assert.deepEqual(second.groups.map(numbers), [[11,12,13,14,15],[16,17,18,19,20]]);
  assert.equal(second.start,10);
  assert.equal(second.end,20);
});

test('odd last pages do not duplicate races and shrinking fields clamp the spread', () => {
  const last = raceOrderSpread(races,5,2,2);
  assert.deepEqual(last.groups.map(numbers),[[21,22,23],[]]);
  assert.equal(last.end,23);
  const smaller = raceOrderSpread(races.slice(0,7),5,2,2);
  assert.equal(smaller.activePage,0);
  assert.deepEqual(smaller.groups.map(numbers),[[1,2,3,4,5],[6,7]]);
  assert.deepEqual(raceOrderSpread([],5,0,2).groups,[[],[]]);
});

test('qualifiers retain single-page navigation; finals and mains enable paired layout', () => {
  assert.deepEqual(raceOrderSpread(races,5,1).groups.map(numbers),[[6,7,8,9,10]]);
  for(const label of ['A Final 1','Finals Round 2','A Main','Feature']) assert.equal(isFinalsRound(label),true);
  assert.equal(isFinalsRound('Qualifier Round 2'),false);
});
