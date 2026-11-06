export const LAYOUT_PRESETS = [
  { id: 'rotate', label: 'Full-screen rotation', description: 'Live results → estimated positions → race order', primary: 44, secondary: 50 },
  { id: 'top', label: 'Race order on top', description: 'Race cards above two results panels', primary: 44, secondary: 50 },
  { id: 'left', label: 'Race order on left', description: 'Full-height race cards, results stacked right', primary: 42, secondary: 50 },
  { id: 'right', label: 'Race order on right', description: 'Full-height race cards, results stacked left', primary: 42, secondary: 50 },
  { id: 'bottom', label: 'Race order at bottom', description: 'Two results panels above the race cards', primary: 44, secondary: 50 },
  { id: 'columns', label: 'Three columns', description: 'Race order, live results, estimated positions', primary: 34, secondary: 50 },
  { id: 'rows', label: 'Three horizontal bands', description: 'Race order, live results, estimated positions', primary: 34, secondary: 50 },
];
export const DEFAULT_DISPLAY = { preset: 'top', primary: 44, secondary: 50, raceRowHeight: 84,
  fonts: { order: 100, live: 100, epd: 100 }, finalsExpand: true, durations: { live: 15, epd: 15, order: 15 } };
export function validateDisplay(input = DEFAULT_DISPLAY) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Display settings must be an object');
  if (input.fonts !== undefined && (!input.fonts || typeof input.fonts !== 'object' || Array.isArray(input.fonts))) throw new Error('Font settings must be an object');
  if (input.durations !== undefined && (!input.durations || typeof input.durations !== 'object' || Array.isArray(input.durations))) throw new Error('Screen durations must be an object');
  const result = { ...DEFAULT_DISPLAY, ...input, fonts: { ...DEFAULT_DISPLAY.fonts, ...input.fonts }, durations: { ...DEFAULT_DISPLAY.durations, ...input.durations } };
  if (!LAYOUT_PRESETS.some(p => p.id === result.preset)) throw new Error('Choose a valid display layout');
  for (const key of ['primary', 'secondary']) {
    if (!Number.isFinite(result[key]) || result[key] < 25 || result[key] > 75) throw new Error('Panel splits must be between 25 and 75 percent');
  }
  for (const key of ['order', 'live', 'epd']) {
    if (!Number.isInteger(result.fonts[key]) || result.fonts[key] < 50 || result.fonts[key] > 150) throw new Error('Font sizes must be between 50 and 150 percent');
  }
  for (const key of ['live', 'epd', 'order']) {
    if (!Number.isInteger(result.durations[key]) || result.durations[key] < 5 || result.durations[key] > 120) throw new Error('Screen durations must be between 5 and 120 seconds');
  }
  if (!Number.isInteger(result.raceRowHeight) || result.raceRowHeight < 56 || result.raceRowHeight > 200) throw new Error('Race row height must be between 56 and 200 pixels');
  if (typeof result.finalsExpand !== 'boolean') throw new Error('Finals expansion must be true or false');
  return { preset: result.preset, primary: result.primary, secondary: result.secondary, raceRowHeight: result.raceRowHeight,
    fonts: Object.fromEntries(['order','live','epd'].map(key => [key, result.fonts[key]])), finalsExpand: result.finalsExpand, durations: Object.fromEntries(['live','epd','order'].map(key => [key, result.durations[key]])) };
}
export function displayGrid(config, finals = false) {
  const { preset, primary: p, secondary: s } = validateDisplay(config);
  if (preset === 'rotate') return { gridTemplateAreas: '"live"', gridTemplateRows: 'minmax(0, 1fr)', gridTemplateColumns: 'minmax(0, 1fr)' };
  const pair = `${p}fr ${100-p}fr`, secondary = `${s}fr ${100-s}fr`;
  const mirrored = preset === "bottom" || preset === "right";
  const finalsPair = `minmax(0, ${mirrored ? 100-p : p}fr) minmax(0, ${mirrored ? p : 100-p}fr)`;
  if (finals) {
    const vertical = ['top','bottom','rows'].includes(preset);
    return { gridTemplateAreas: preset === 'bottom' || preset === 'right' ? '"live" "order"' : '"order" "live"',
      gridTemplateRows: vertical ? finalsPair : 'minmax(0, 1fr)', gridTemplateColumns: vertical ? 'minmax(0, 1fr)' : finalsPair,
      ...(!vertical ? { gridTemplateAreas: preset === 'right' ? '"live order"' : '"order live"' } : {}) };
  }
  const thirds = `${p}fr ${(100-p)*s/100}fr ${(100-p)*(100-s)/100}fr`;
  const grids = {
    top: ['"order order" "live epd"', pair, secondary],
    bottom: ['"live epd" "order order"', `${100-p}fr ${p}fr`, secondary],
    left: ['"order live" "order epd"', secondary, pair],
    right: ['"live order" "epd order"', secondary, `${100-p}fr ${p}fr`],
    columns: ['"order live epd"', 'minmax(0, 1fr)', thirds],
    rows: ['"order" "live" "epd"', thirds, 'minmax(0, 1fr)'],
  };
  const [gridTemplateAreas, gridTemplateRows, gridTemplateColumns] = grids[preset];
  // Explicit zero minima keep content from changing the chosen proportions.
  const zeroMin = value => value.replace(/([\d.]+)fr/g, 'minmax(0, $1fr)');
  return { gridTemplateAreas, gridTemplateRows: zeroMin(gridTemplateRows).replaceAll('minmax(0, minmax(0, 1fr))','minmax(0, 1fr)'),
    gridTemplateColumns: zeroMin(gridTemplateColumns).replaceAll('minmax(0, minmax(0, 1fr))','minmax(0, 1fr)') };
}
export function panelTypography(config, panel) {
  const factor = validateDisplay(config).fonts[panel] / 100;
  return { '--race-row-height': `${validateDisplay(config).raceRowHeight}px`, '--rd-font-scale': 0.8 * factor, '--panel-font-factor': factor,
    '--live-row-height': `${48 * Math.max(1, factor)}px`, '--epd-row-height': `${56 * Math.max(1, factor)}px` };
}
export function splitHandles(config) {
  if (config.preset === "rotate") return [];
  const { preset, primary: p, secondary: s } = config;
  if (preset === 'rows' || preset === 'columns') {
    const axis = preset === 'rows' ? 'y' : 'x';
    return [{ key: 'primary', axis, at:p, from:0, to:100 },
      { key:'secondary', axis, at:p+(100-p)*s/100, from:0, to:100 }];
  }
  const horizontal = preset === 'top' || preset === 'bottom';
  const at = preset === 'bottom' || preset === 'right' ? 100-p : p;
  return [{ key:'primary', axis:horizontal?'y':'x', at, from:0, to:100 },
    { key:'secondary', axis:horizontal?'x':'y', at:s,
      from:preset === 'top' || preset === 'left' ? p : 0,
      to:preset === 'top' || preset === 'left' ? 100 : 100-p }];
}
export function splitValue(config, key, position) {
  let value = position;
  if (key === 'primary' && ['bottom','right'].includes(config.preset)) value = 100-position;
  if (key === 'secondary' && ['rows','columns'].includes(config.preset)) value = (position-config.primary)/(100-config.primary)*100;
  return Math.round(Math.max(25, Math.min(75, value)));
}

export const ROTATION_ORDER = ["live", "epd", "order"];
export function nextDisplayPanel(panel) { return ROTATION_ORDER[(ROTATION_ORDER.indexOf(panel) + 1) % ROTATION_ORDER.length]; }
