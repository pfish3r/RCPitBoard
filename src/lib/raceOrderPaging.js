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

// Two rows of cards, with columns chosen from the actual panel width.
export function raceCardPageSize(width) {
  return width >= 1000 ? 10 : width >= 600 ? 6 : width >= 380 ? 4 : 2;
}

export function raceCardRows(races, pageSize) {
  const columns = Math.max(1, Math.floor(pageSize / 2));
  const split = races.length <= columns ? races.length : Math.ceil(races.length / 2);
  return races.length > split ? [races.slice(0, split), races.slice(split)] : [races];
}
