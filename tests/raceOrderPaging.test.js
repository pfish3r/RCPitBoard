import test from 'node:test';
import assert from 'node:assert/strict';
import { raceOrderSpread, raceCardPageSize } from '../src/lib/raceOrderPaging.js';
const races = Array.from({ length: 23 }, (_, index) => ({ seq: index + 1 }));

test('race cards fit two rows at each panel width', () => {
  for (const [width, size] of [[320,2], [380,4], [599,4], [600,6], [999,6], [1000,10], [1920,10]]) {
    assert.equal(raceCardPageSize(width), size);
    assert.equal(size % 2, 0);
  }
});
test('ten-card pages advance without duplicates and preserve the final partial page', () => {
  const pages = [0,1,2].map(page => raceOrderSpread(races,10,page));
  assert.deepEqual(pages.map(p => p.groups[0].map(r => r.seq)), [races.slice(0,10),races.slice(10,20),races.slice(20)].map(group => group.map(r => r.seq)));
  assert.equal(pages[2].end,23);
  assert.equal(pages[0].pageCount,3);
  assert.equal(raceOrderSpread(races.slice(0,4),10,2).activePage,0);
  assert.deepEqual(raceOrderSpread([],10).groups,[[]]);
});
import { raceCardRows } from '../src/lib/raceOrderPaging.js';
test('partial race pages balance two rows and a small field uses one row', () => {
  assert.deepEqual(raceCardRows(races.slice(0,4),10).map(row => row.length),[4]);
  assert.deepEqual(raceCardRows(races.slice(0,7),10).map(row => row.length),[4,3]);
  assert.deepEqual(raceCardRows(races.slice(0,9),10).map(row => row.length),[5,4]);
  assert.deepEqual(raceCardRows(races.slice(0,2),2).map(row => row.length),[1,1]);
});
