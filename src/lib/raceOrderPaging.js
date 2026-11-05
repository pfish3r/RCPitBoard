// A spread advances as one unit, so the right page always follows the left.
export function raceOrderSpread(timeline, pageSize, page = 0, columns = 1) {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const count = columns === 2 ? 2 : 1;
  const pageCount = Math.max(1, Math.ceil(timeline.length / (size * count)));
  const activePage = Math.max(0, Math.min(Math.floor(page) || 0, pageCount - 1));
  const start = activePage * size * count;
  return { pageCount, activePage, start, end: Math.min(start + size * count, timeline.length),
    groups: Array.from({ length: count }, (_, index) => timeline.slice(start + index * size, start + (index + 1) * size)) };
}
