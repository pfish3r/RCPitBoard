import test from 'node:test';
import assert from 'node:assert/strict';
import { liveResultGroups, predictedFinish } from '../src/lib/liveResults.js';

test('top ten are grouped by position without losing last, best or predicted timing', () => {
  const rows = Array.from({length:12}, (_,i) => ({pos:i+1,name:`Driver ${i+1}`,lapTime:'18.234',fastLap:'17.982',pace:'17/5:02.123'})).reverse();
  const groups = liveResultGroups(rows);
  assert.deepEqual(groups.map(group => group.map(slot => slot.position)), [[1,2,3,4,5],[6,7,8,9,10]]);
  assert.deepEqual(groups.flat().map(slot => slot.row.pos), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(groups[0][0].row.fastLap,'17.982');
  assert.equal(groups[1][4].row.lapTime,'18.234');
  assert.equal(predictedFinish(groups[1][4].row.pace),'17 / 5:02.123');
  assert.equal(rows[0].pos,12);
});

test('short or incomplete fields keep five rank slots in both halves', () => {
  const groups = liveResultGroups([{pos:1,name:'Leader'},{pos:6,name:'Sixth'},{pos:0,name:'Invalid'}]);
  assert.equal(groups[0].length,5);
  assert.equal(groups[1].length,5);
  assert.equal(groups[0][0].row.name,'Leader');
  assert.equal(groups[0][1].row,null);
  assert.equal(groups[1][0].row.name,'Sixth');
  assert.ok(liveResultGroups().flat().every(slot => slot.row === null));
});

test('predicted finishes preserve laps and milliseconds and handle missing timing', () => {
  assert.equal(predictedFinish('17 / 5:02.123'),'17 / 5:02.123');
  assert.equal(predictedFinish(null),'-');
});

test('live feed keeps fastest-lap milliseconds and leaves missing laps blank', async () => {
  const { buildLive } = await import('../server/liverc.js');
  const live = buildLive({race:'2WD Modified (Heat 1)|1|running||1|10|Q1',clock:'145|155',
    drivers:JSON.stringify({p1:'1|Paul Fisher|1|9|18.234|145|17/5:02.123|17.982',p2:'2|Driver Two|2|0||||0'})});
  assert.equal(live.rows[0].fastLap,'17.982');
  assert.equal(live.rows[0].lapTime,'18.234');
  assert.equal(live.rows[0].pace,'17/5:02.123');
  assert.equal(live.rows[1].fastLap,'');
  assert.equal(live.timeRemaining,'2:35');
});
