import test from 'node:test';
import assert from 'node:assert/strict';
import { shortRoundLabel } from '../src/lib/roundLabels.js';
test('round tabs abbreviate seeding, practice, qualifying and finals',()=>{
  for(const [label,expected] of [['Seeding Round 1','S1'],['Seeding Round 2','S2'],['Practice Round 1','P1'],['Practice Round 10','P10'],['Qualifier Round 1','Q1'],['Qualifying Round 2','Q2'],['Qualy 3','Q3'],['Main Events','F'],['Finals Round 2','F'],['A Main','F'],['Feature','F'],['Q2','Q2'],['s 1','S1'],['Open session','Open session'],['','']]) assert.equal(shortRoundLabel(label),expected);
});
