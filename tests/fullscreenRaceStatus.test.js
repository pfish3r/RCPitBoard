import test from 'node:test';
import assert from 'node:assert/strict';
import { fullscreenRaceStatus } from '../src/lib/fullscreenRaceStatus.js';
const input = { current:{status:'running',seq:4,className:'2WD'}, timeline:[{num:4,racesAway:0,className:'2WD'},{num:5,isNext:true,secondsAhead:180,estimatedStartAt:280000}], timing:{at:160000}, now:100000, estimatesAvailable:true, paused:false };
test('persistent full-screen context uses active race and live countdown estimates',()=>{
  const value=fullscreenRaceStatus(input);
  assert.equal(value.race.num,4); assert.equal(value.next.num,5);
  assert.equal(value.remaining,60);assert.equal(value.finishAt,160000);assert.equal(value.nextAt,280000);
  assert.equal(fullscreenRaceStatus({...input,now:101000}).remaining,59);
});
test('stale timing is hidden but paused estimates remain frozen at board time',()=>{
  const stale=fullscreenRaceStatus({...input,estimatesAvailable:false});
  assert.equal(stale.remaining,null);assert.equal(stale.nextAt,null);assert.equal(stale.nextSeconds,null);
  assert.equal(fullscreenRaceStatus({...input,estimatesAvailable:false,paused:true}).remaining,60);
});
test('finished races clear on-track context and missing queues have no invented times',()=>{
  assert.equal(fullscreenRaceStatus({...input,current:{status:'complete'}}).race,null);
  const empty=fullscreenRaceStatus({now:1000});
  assert.equal(empty.race,null);assert.equal(empty.next,null);assert.equal(empty.nextAt,null);
  assert.equal(fullscreenRaceStatus({...input,now:200000}).remaining,0);
});
