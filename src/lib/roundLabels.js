export function shortRoundLabel(label) {
  const text = String(label || '').trim();
  const number = text.match(/\d+/)?.[0] || '1';
  if (/seed/i.test(text)) return `S${number}`;
  if (/practice/i.test(text)) return `P${number}`;
  if (/qualif|qualy|quali\b/i.test(text)) return `Q${number}`;
  if (/final|main|feature/i.test(text)) return 'F';
  const code = text.match(/^([SPQ])\s*(\d+)$/i);
  return code ? `${code[1].toUpperCase()}${code[2]}` : text;
}
