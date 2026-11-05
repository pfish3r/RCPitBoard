import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import fontScale from '../font-scale.js';

test('font scale covers rem, pixels and responsive sizes without shrinking layout', async () => {
  const result = await postcss([fontScale()]).process('.a {font-size: 1.5rem; padding: 1rem} .b {font-size: 11px} .c {font-size: clamp(1rem, 2vw, 2rem)}', {from:undefined});
  assert.ok(result.css.includes('calc(1.5rem * var(--rd-font-scale, 0.8))'));
  assert.ok(result.css.includes('calc(11px * var(--rd-font-scale, 0.8))'));
  assert.ok(result.css.includes('calc(clamp(1rem, 2vw, 2rem) * var(--rd-font-scale, 0.8))'));
  assert.ok(result.css.includes('padding: 1rem'));
});

test('inherited sizes and already scaled values are not reduced a second time', async () => {
  const css='.note {font-size: 0.7em} button {font-size: 100%} .inherit {font-size: inherit} .scaled {font-size: calc(1rem * var(--rd-font-scale, 0.8))}';
  const result=await postcss([fontScale()]).process(css,{from:undefined});
  assert.equal(result.css,css);
});
