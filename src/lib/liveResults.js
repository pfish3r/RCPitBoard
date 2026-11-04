// Keep rank slots stable so a missing driver never shifts sixth place into the first block.
export function liveResultGroups(rows = []) {
  const ranked = new Map();
  for (const row of rows) {
    const position = Number(row.pos);
    if (Number.isInteger(position) && position >= 1 && position <= 10 && !ranked.has(position)) ranked.set(position, row);
  }
  return [0, 5].map(offset => Array.from({ length: 5 }, (_, index) => ({
    position: offset + index + 1,
    row: ranked.get(offset + index + 1) || null,
  })));
}

export function predictedFinish(value) {
  return String(value || "-").replace(/\s*\/\s*/g, " / ");
}
