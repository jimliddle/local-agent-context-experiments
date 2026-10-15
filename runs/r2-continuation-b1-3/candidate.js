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

  // Precompute totals and per-machine times
  const totals = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < m; k++) s += times[i][k];
    totals[i] = s;
  }

  // Generate multiple initial candidates
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
    candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[a] - scores[b] || a - b));
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
  candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => totals[a] - totals[b] || a - b));

  // First machine ascending
  candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => times[a][0] - times[b][0] || a - b));

  // Last machine descending
  candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => times[b][m - 1] - times[a][m - 1] || a - b));

  // Min-max ratio: sort by min/max processing time
  candidates.push(Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    let mina = Infinity, maxa = 0, minb = Infinity, maxb = 0;
    for (let k = 0; k < m; k++) {
      if (times[a][k] < mina) mina = times[a][k];
      if (times[a][k] > maxa) maxa = times[a][k];
      if (times[b][k] < minb) minb = times[b][k];
      if (times[b][k] > maxb) maxb = times[b][k];
    }
    const ra = mina / maxa, rb = minb / maxb;
    return ra - rb || a - b;
  }));

  // Pick best initial by makespan
  let bestOrder = candidates[0];
  let bestMs = makespan(bestOrder);
  for (let c = 1; c < candidates.length; c++) {
    const ms = makespan(candidates[c]);
    if (ms < bestMs) {
      bestMs = ms;
      bestOrder = candidates[c];
    }
  }

  // Local search: pairwise swaps with first-improvement
  const cur = bestOrder.slice();
  let curMs = bestMs;
  let improved = true;
  let iter = 0;
  const maxIter = n <= 20 ? 500 : 250;
  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        swap(cur, i, j);
        const ms = makespan(cur);
        if (ms < curMs) {
          curMs = ms;
          improved = true;
        } else {
          swap(cur, i, j);
        }
      }
    }
  }

  // Second pass: try insert moves (remove job, reinsert at best position)
  let improved2 = true;
  let iter2 = 0;
  const maxIter2 = n <= 20 ? 200 : 100;
  while (improved2 && iter2 < maxIter2) {
    improved2 = false;
    iter2++;
    for (let i = 0; i < n; i++) {
      const job = cur[i];
      cur.splice(i, 1);
      let bestPos = i;
      let bestMsPos = Infinity;
      for (let pos = 0; pos < n; pos++) {
        cur.splice(pos, 0, job);
        const ms = makespan(cur);
        if (ms < bestMsPos) {
          bestMsPos = ms;
          bestPos = pos;
        }
        cur.splice(pos, 1);
      }
      cur.splice(bestPos, 0, job);
      if (bestMsPos < curMs) {
        curMs = bestMsPos;
        improved2 = true;
      }
    }
  }

  // Final pairwise pass
  let improved3 = true;
  let iter3 = 0;
  const maxIter3 = n <= 20 ? 200 : 100;
  while (improved3 && iter3 < maxIter3) {
    improved3 = false;
    iter3++;
    for (let i