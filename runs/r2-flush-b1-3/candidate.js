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

  function reverseSegment(arr, i, j) {
    while (i < j) { swap(arr, i, j); i++; j--; }
  }

  // Johnson's rule for m=2
  function johnson() {
    const A = [], B = [];
    for (let i = 0; i < n; i++) {
      if (times[i][0] < times[i][1]) A.push(i); else B.push(i);
    }
    A.sort((a, b) => times[a][0] - times[b][0] || a - b);
    B.sort((a, b) => times[b][1] - times[a][1] || a - b);
    return A.concat(B);
  }

  // Palmer heuristic
  function palmer() {
    const half = Math.floor(m / 2);
    const scores = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < half; k++) s += times[i][k];
      for (let k = m - half; k < m; k++) s -= times[i][k];
      scores[i] = s;
    }
    const arr = Array.from({ length: n }, (_, i) => i);
    arr.sort((a, b) => scores[a] - scores[b] || a - b);
    return arr;
  }

  // NEH-style constructive heuristic
  function neh() {
    const totals = new Array(n);
    for (let i = 0; i < n; i++) {
      let t = 0;
      for (let k = 0; k < m; k++) t += times[i][k];
      totals[i] = t;
    }
    const sorted = Array.from({ length: n }, (_, i) => i);
    sorted.sort((a, b) => totals[b] - totals[a] || a - b);

    const order = [];
    for (const job of sorted) {
      let bestPos = 0, bestMs = Infinity;
      for (let p = 0; p <= order.length; p++) {
        const trial = order.slice(0, p).concat([job]).concat(order.slice(p));
        const ms = makespan(trial);
        if (ms < bestMs) { bestMs = ms; bestPos = p; }
      }
      order.splice(bestPos, 0, job);
    }
    return order;
  }

  // Generate multiple initial candidates
  const candidates = [];
  if (m === 2) candidates.push(johnson());
  candidates.push(palmer());
  if (m >= 3) candidates.push(neh());

  const byFirst = Array.from({ length: n }, (_, i) => i);
  byFirst.sort((a, b) => times[a][0] - times[b][0] || a - b);
  candidates.push(byFirst);

  const byLast = Array.from({ length: n }, (_, i) => i);
  byLast.sort((a, b) => times[b][m - 1] - times[a][m - 1] || a - b);
  candidates.push(byLast);

  // Pick best initial
  let best = candidates[0];
  let bestMs = makespan(best);
  for (let c = 1; c < candidates.length; c++) {
    const ms = makespan(candidates[c]);
    if (ms < bestMs) { best = candidates[c]; bestMs = ms; }
  }

  // Local search: swaps + 2-opt
  const maxIter = n <= 20 ? 400 : 200;
  let improved = true;
  let iter = 0;
  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        swap(best, i, j);
        const ms = makespan(best);
        if (ms < bestMs) { bestMs = ms; improved = true; }
        else { swap(best, i, j); }
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        reverseSegment(best, i, j);
        const ms = makespan(best);
        if (ms < bestMs) { bestMs = ms; improved = true; }
        else { reverseSegment(best, i, j); }
      }
    }
  }

  return best;
}