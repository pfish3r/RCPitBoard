import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DISPLAY, LAYOUT_PRESETS, validateDisplay, displayGrid, splitHandles, splitValue, panelTypography, nextDisplayPanel } from '../shared/displayLayout.js';
import { raceCardGeometry, raceCardRows } from '../src/lib/raceOrderPaging.js';

test('old settings acquire display defaults and invalid display settings are rejected', () => {
  assert.deepEqual(validateDisplay(), DEFAULT_DISPLAY);
  for (const value of [null, [], {preset:'unknown'}, {primary:10}, {secondary:Infinity}, {fonts:{live:151}}, {fonts:{order:'120'}}, {finalsExpand:'yes'}]) assert.throws(()=>validateDisplay(value));
  assert.equal(validateDisplay({preset:'left'}).fonts.epd,100);
});
test('six layouts assign all panels and finals allocate only race order and live results', () => {
  assert.equal(LAYOUT_PRESETS.length,7);
  for (const preset of LAYOUT_PRESETS.filter(p => p.id !== "rotate")) {
    const config={...DEFAULT_DISPLAY,preset:preset.id};
    const grid=displayGrid(config);
    for(const area of ['order','live','epd']) assert.ok(grid.gridTemplateAreas.includes(area));
    const finals=displayGrid(config,true);
    assert.ok(!finals.gridTemplateAreas.includes('epd'));
    assert.ok(finals.gridTemplateAreas.includes('order') && finals.gridTemplateAreas.includes('live'));
    assert.ok(!grid.gridTemplateRows.includes('minmax(0, minmax'));
  }
});
test('drag coordinates preserve each layout split including mirrored and nested dividers', () => {
  for(const preset of LAYOUT_PRESETS) {
    const config={...DEFAULT_DISPLAY,preset:preset.id,primary:40,secondary:60};
    for(const handle of splitHandles(config)) assert.equal(splitValue(config,handle.key,handle.at),config[handle.key]);
    assert.ok(splitValue(config,'primary',-100)>=25);
    assert.ok(splitValue(config,'primary',200)<=75);
  }
});
test('panel font settings scale independently and row heights remain large enough', () => {
  const config={...DEFAULT_DISPLAY,fonts:{order:150,live:125,epd:75}};
  assert.ok(Math.abs(panelTypography(config,'order')['--rd-font-scale']-1.2)<0.0001);
  assert.equal(panelTypography(config,'live')['--live-row-height'],'60px');
  assert.equal(panelTypography(config,'epd')['--epd-row-height'],'56px');
});
test('short and narrow panels reduce race page capacity and keep a single row together', () => {
  assert.deepEqual(raceCardGeometry(1200,400),{columns:5,pageSize:10});
  assert.deepEqual(raceCardGeometry(1200,180),{columns:5,pageSize:5});
  assert.deepEqual(raceCardRows([1,2,3,4,5],5,5),[[1,2,3,4,5]]);
  assert.ok(raceCardGeometry(700,300,1.5).pageSize<raceCardGeometry(700,300,1).pageSize);
});

test('full-screen rotation repeats in order and validates each screen duration', () => {
  assert.deepEqual(['live',nextDisplayPanel('live'),nextDisplayPanel('epd'),nextDisplayPanel('order')],['live','epd','order','live']);
  assert.equal(displayGrid({...DEFAULT_DISPLAY,preset:'rotate'}).gridTemplateAreas,'"live"');
  assert.deepEqual(splitHandles({...DEFAULT_DISPLAY,preset:'rotate'}),[]);
  for (const seconds of [0,4,121,15.5]) assert.throws(()=>validateDisplay({durations:{live:seconds}}));
  assert.equal(validateDisplay({durations:{live:30}}).durations.epd,15);
});
