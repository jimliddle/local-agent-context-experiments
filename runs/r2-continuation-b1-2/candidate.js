function solve(times) {
  const n = times.length;
  const m = times[0].length;

  function makespan(order) {
    const finish = new Array(m).fill(0);
    for (let idx = 0; idx < n; idx++) {
      const job = order[idx];
      let t = 0;
      for (let k = 0; k < m; k++) {
        t = Math.max(t, finish[k]) + times[job][k];
        finish[k] = t;
      }
    }
    return finish[m - 1];
  }

  function swap(arr, i, j) {
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }

  function localSearch(start) {
    const cur = start.slice();
    let bestMs = makespan(cur);
    let improved = true;
    let iter = 0;
    const maxIter = n <= 20 ? 400 : 200;
    while (improved && iter < maxIter) {
      improved = false;
      iter++;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          swap(cur, i, j);
          const ms = makespan(cur);
          if (ms < bestMs) {
            bestMs = ms;
            improved = true;
          } else {
            swap(cur, i, j);
          }
        }
      }
    }
    return { order: cur, ms: bestMs };
  }

  // Build multiple initial candidates
  const candidates = [];

  // Palmer's heuristic
  if (m > 2) {
    const half = Math.floor(m / 2);
    const scores = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < half; k++) s += times[i][k];
      for (let k = m - half; k < m; k++) s -= times[i][k];
      scores[i] = s;
    }
    const p = Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[a] - scores[b] || a - b);
    candidates.push(p);
  }

  // Johnson's rule for 2 machines
  if (m === 2) {
    const A = [], B = [];
    for (let i = 0; i < n; i++) {
      if (times[i][0] < times[i][1]) A.push(i);
      else B.push(i);
    }
    A.sort((a, b) => times[a][0] - times[b][0] || a - b);
    B.sort((a, b) => times[b][1] - times[a][1] || a - b);
    candidates.push(A.concat(B));
  }

  // Total processing time ascending
  const totals = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < m; k++) s += times[i][k];
    totals[i] = s;
  }
  candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => totals[a] - totals[b] || a - b));

  // First machine ascending
  candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => times[a][0] - times[b][0] || a - b));

  // Last machine descending
  candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => times[b][m - 1] - times[a][m - 1] || a - b));

  // Best candidate by initial makespan
  let bestOrder = candidates[0];
  let bestMs = makespan(bestOrder);
  for (const c of candidates) {
    const ms = makespan(c);
    if (ms < bestMs) {
      bestMs = ms;
      bestOrder = c;
    }
  }

  // Local search from best initial
  const result = localSearch(bestOrder);
  return result.order;
}