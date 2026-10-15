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

  function insert(arr, from, to) {
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
  }

  // Initial heuristic
  let best;
  if (m === 2) {
    const A = [];
    const B = [];
    for (let i = 0; i < n; i++) {
      if (times[i][0] < times[i][1]) A.push(i);
      else B.push(i);
    }
    A.sort((a, b) => times[a][0] - times[b][0] || a - b);
    B.sort((a, b) => times[b][1] - times[a][1] || a - b);
    best = A.concat(B);
  } else {
    const half = Math.floor(m / 2);
    const scores = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < half; k++) s += times[i][k];
      for (let k = m - half; k < m; k++) s -= times[i][k];
      scores[i] = s;
    }
    best = Array.from({ length: n }, (_, i) => i);
    best.sort((a, b) => scores[a] - scores[b] || a - b);
  }

  let bestMs = makespan(best);

  // Multi-start: try several initial orders, keep best
  const starts = [best.slice()];
  
  // Reverse
  starts.push(best.slice().reverse());
  
  // Sort by total processing time
  const total = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < m; k++) s += times[i][k];
    total[i] = s;
  }
  const byTotal = Array.from({ length: n }, (_, i) => i);
  byTotal.sort((a, b) => total[a] - total[b] || a - b);
  starts.push(byTotal);
  
  // Sort by first machine
  const byFirst = Array.from({ length: n }, (_, i) => i);
  byFirst.sort((a, b) => times[a][0] - times[b][0] || a - b);
  starts.push(byFirst);
  
  // Sort by last machine desc
  const byLast = Array.from({ length: n }, (_, i) => i);
  byLast.sort((a, b) => times[b][m - 1] - times[a][m - 1] || a - b);
  starts.push(byLast);

  for (const start of starts) {
    const ms = makespan(start);
    if (ms < bestMs) {
      bestMs = ms;
      best = start;
    }
  }

  // Local search: pairwise swaps
  const maxIter = n <= 22 ? 40 : 15;
  let improved = true;
  let iter = 0;
  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        swap(best, i, j);
        const ms = makespan(best);
        if (ms < bestMs) {
          bestMs = ms;
          improved = true;
        } else {
          swap(best, i, j);
        }
      }
    }
  }

  // Insertion moves
  improved = true;
  let insIter = 0;
  const maxInsIter = n <= 22 ? 20 : 8;
  while (improved && insIter < maxInsIter) {
    improved = false;
    insIter++;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        insert(best, i, j);
        const ms = makespan(best);
        if (ms < bestMs) {
          bestMs = ms;
          improved = true;
          i = 0; // restart
        } else {
          // move back
          const item = best.splice(j, 1)[0];
          best.splice(i, 0, item);
        }
      }
    }
  }

  return best;
}