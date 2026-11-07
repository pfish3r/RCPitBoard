import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEpd, rankEstimatedPositions, roundForCode, roundRank } from '../server/liverc.js';

// Synthetic EPD packets using published Potteries Seeding Round 1 examples:
// https://potteriesrcmcc.liverc.com/results/?p=view_round_ranking&id=1601510&o=top_3_consecutive
const packet = values => JSON.stringify(Object.fromEntries(values.map((value,index)=>['e'+index,value])));
test('seeding preserves LiveRC ranking and decimal/consecutive times instead of sorting race totals',()=>{
  const epd=buildEpd('2wd|8|8|Top 3 Consecutive',packet([
    '0|3|0|WILL FISHER|54.579|will',
    '0|1|0|JAMIE BEASLEY|53.814|jamie',
    '0|2|-1|CHRIS EVISON|54.173|chris',
    '1|24|20|JAMIE BEASLEY|1:00.278|jamie',
  ]));
  const ranked=rankEstimatedPositions(epd,'Seeding Round 1','S1');
  assert.deepEqual(ranked.rows.map(r=>[r.pos,r.name,r.result]),[[1,'JAMIE BEASLEY','53.814'],[2,'CHRIS EVISON','54.173'],[3,'WILL FISHER','54.579']]);
  assert.equal(ranked.scoring,'seeding');assert.equal(ranked.resultLabel,'Seeding result');
  assert.equal(ranked.rows[1].change,-1);
  assert.equal(epd.rows.length,4);assert.equal(epd.rows[0].pos,3);
});
test('S1 and seeding labels protect supplied order even if EPD values look like race totals',()=>{
  const epd=buildEpd('2wd|8|8|',packet([
    '0|1|0|JAMIE BEASLEY|10/3:05.832|jamie',
    '0|2|0|CHRIS EVISON|8/3:12.603|chris',
    '0|3|0|WILL FISHER|10/3:05.461|will',
  ]));
  for(const [label,code] of [['Seeding Round 1',''],['','S1']]) assert.deepEqual(rankEstimatedPositions(epd,label,code).rows.map(r=>r.name),['JAMIE BEASLEY','CHRIS EVISON','WILL FISHER']);
});
test('seeding keeps supplied unranked results and positions rather than inventing race pace',()=>{
  const epd=buildEpd('Vintage|1|2|',packet(['0|5|0|Driver A|1:07.629|a','0|20|0|Driver B|DNS|b']));
  assert.deepEqual(rankEstimatedPositions(epd,'Seeding Round 1').rows.map(r=>[r.pos,r.result]),[[5,'1:07.629'],[20,'DNS']]);
});
test('normal qualifying retains best-run deduplication and laps/time ranking',()=>{
  const epd=buildEpd('2wd|1|8|Laps/Time',packet([
    '0|1|0|Driver A|10/3:05.000 (DNF)|a',
    '0|3|0|Driver A|9/3:01.123|a',
    '0|2|0|Driver B|10/3:05.461|b',
  ]));
  const ranked=rankEstimatedPositions(epd,'Qualifier Round 1','Q1');
  assert.equal(ranked.scoring,'laps-time');
  assert.deepEqual(ranked.rows.map(r=>[r.pos,r.name,r.result]),[[1,'Driver B','10/3:05.461'],[2,'Driver A','9/3:01.123']]);
});
test('seeding rounds sort before qualifying and S codes match the correct heat sheet',()=>{
  const rounds=['Qualifier Round 1','Main Events','Seeding Round 2','Practice Round 1','Seeding Round 1'].map(label=>({label}));
  assert.deepEqual([...rounds].sort((a,b)=>roundRank(a.label)-roundRank(b.label)).map(r=>r.label),['Practice Round 1','Seeding Round 1','Seeding Round 2','Qualifier Round 1','Main Events']);
  assert.equal(roundForCode('S1',rounds).label,'Seeding Round 1');
  assert.equal(roundForCode(' S2 ',rounds).label,'Seeding Round 2');
  assert.equal(roundForCode('S9',rounds),null);
  assert.equal(roundForCode('Q1',rounds).label,'Qualifier Round 1');
});
