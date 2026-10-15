function solve(times) {
  const n = times.length, m = times[0].length;
  const jobs = times.map((row, i) => i);

  function makespan(order) {
    const comp = new Array(m).fill(0);
    for (const j of order) {
      for (let k = 0; k < m; k++) {
        comp[k] = Math.max(comp[k], comp[k - 1]) + times[j][k];
      }
    }
    return comp[m - 1];
  }

  // Johnson's rule for 2 machines
  function johnson(a, b) {
    const idx = times.map((_, i) => i);
    const left = [], right = [];
    for (const i of idx) {
      if (a[i] < b[i]) left.push(i); else right.push(i);
    }
    left.sort((x, y) => a[x] - a[y] || x - y);
    right.sort((x, y) => b[y] - b[b] || x - y);
    return left.concat(right);
  }

  // Build initial candidates
  const candidates = [];

  // Descending total (current)
  candidates.push(jobs.slice().sort((a, b) =>
    times[b].reduce((s, x) => s + x, 0) - times[a].reduce((s, x) => s + x, 0) || a - b));

  // Ascending total
  candidates.push(jobs.slice().sort((a, b) =>
    times[a].reduce((s, x) => s + x, 0) - times[b].reduce((s, x) => s + x, 0) || a - b));

  // Johnson on first two machines
  candidates.push(johnson(times.map(r => r[0]), times.map(r => r[1])));

  // Johnson on last two machines (reversed)
  const last = m - 1;
  const revTimes = times.map(r => r.slice().reverse());
  const revIdx = revTimes.map((_, i) => i);
  const left = [], right = [];
  for (const i of revIdx) {
    if (revTimes[i][0] < revTimes[i][1]) left.push(i); else right.push(i);
  }
  left.sort((x, y) => revTimes[x][0] - revTimes[y][0] || x - y);
  right.sort((x, y) => revTimes[y][1] - revTimes[y][1] || x - y);
  candidates.push(left.concat(right).reverse());

  // Johnson on machine 0 and machine m-1
  const j0 = times.map(r => r[0]), jL = times.map(r => r[m - 1]);
  const l2 = [], r2 = [];
  for (const i of revIdx) {
    if (j0[i] < jL[i]) l2.push(i); else r2.push(i);
  }
  l2.sort((x, y) => j0[x] - j0[y] || x - y);
  r2.sort((x, y) => jL[y] - jL[y] || x - y);
  candidates.push(l2.concat(r2));

  // Best first by makespan
  candidates.sort((a, b) => makespan(a) - makespan(b));

  // Local search: pairwise swaps
  let best = candidates[0].slice();
  let bestMs = makespan(best);

  for (let iter = 0; iter < 3; iter++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const trial = best.slice();
        const tmp = trial[i]; trial[i] = trial[j]; trial[j] = tmp;
        const ms = makespan(trial);
        if (ms < bestMs) {
          best = trial; bestMs = ms; improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return best;
}