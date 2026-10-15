function solve(times) {
  const n = times.length, m = times[0].length;
  const jobs = times.map((_, i) => i);
  const totals = times.map(r => r.reduce((s, x) => s + x, 0));

  function makespan(order) {
    const comp = new Array(m).fill(0);
    for (const j of order) {
      for (let k = 0; k < m; k++) {
        comp[k] = Math.max(comp[k], comp[k - 1]) + times[j][k];
      }
    }
    return comp[m - 1];
  }

  function johnson(a, b) {
    const idx = times.map((_, i) => i);
    const left = [], right = [];
    for (const i of idx) {
      if (a[i] < b[i]) left.push(i); else right.push(i);
    }
    left.sort((x, y) => a[x] - a[y] || x - y);
    right.sort((x, y) => b[y] - b[y] || x - y);
    return left.concat(right);
  }

  const candidates = [];
  candidates.push(jobs.slice().sort((a, b) => totals[b] - totals[a] || a - b));
  candidates.push(jobs.slice().sort((a, b) => totals[a] - totals[b] || a - b));
  candidates.push(johnson(times.map(r => r[0]), times.map(r => r[1])));
  candidates.push(johnson(times.map(r => r[m - 2]), times.map(r => r[m - 1])).reverse());
  candidates.push(johnson(times.map(r => r[0]), times.map(r => r[m - 1])));
  candidates.push(johnson(times.map(r => r[m - 1]), times.map(r => r[0])).reverse());

  candidates.sort((a, b) => makespan(a) - makespan(b));

  let best = candidates[0].slice();
  let bestMs = makespan(best);

  for (let iter = 0; iter < 4; iter++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const trial = best.slice();
        const tmp = trial[i]; trial[i] = trial[j]; trial[j] = tmp;
        const ms = makespan(trial);
        if (ms < bestMs) { best = trial; bestMs = ms; improved = true; }
      }
    }
    if (!improved) break;
  }

  return best;
}