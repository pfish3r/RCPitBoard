export function projectionParts(value) {
  const text = String(value || '-').trim() || '-';
  const match = text.match(/^(\d+)\s*\/\s*(\d+:\d+(?:\.\d+)?)(?:\s*(.*))?$/);
  return match ? { time: `${match[1]} / ${match[2]}`, note: (match[3] || '').trim() }
    : { time: text, note: '' };
}
