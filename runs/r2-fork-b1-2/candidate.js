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

  function adjacentSwap(arr, i) {
    const t = arr[i];
    arr[i] = arr[i + 1];
    arr[i + 1] = t;
  }

  function buildPalmer() {
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

  function buildJohnson() {
    const A = [];
    const B = [];
    for (let i = 0; i < n; i++) {
      if (times[i][0] < times[i][1]) A.push(i);
      else B.push(i);
    }
    A.sort((a, b) => times[a][0] - times[b][0] || a - b);
    B.sort((a, b) => times[b][1] - times[a][1] || a - b);
    return A.concat(B);
  }

  function buildTotal() {
    const tot = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += times[i][k];
      tot[i] = s;
    }
    const arr = Array.from({ length: n }, (_, i) => i);
    arr.sort((a, b) => tot[b] - tot[a] || a - b);
    return arr;
  }

  // Build multiple initial candidates
  const candidates = [];
  if (m === 2) candidates.push(buildJohnson());
  else {
    candidates.push(buildPalmer());
    candidates.push(buildTotal());
    // Reverse Palmer
    const rp = buildPalmer();
    rp.reverse();
    candidates.push(rp);
  }

  let best = candidates[0];
  let bestMs = makespan(best);
  for (let c = 1; c < candidates.length; c++) {
    const ms = makespan(candidates[c]);
    if (ms < bestMs) {
      bestMs = ms;
      best = candidates[c];
    }
  }

  // Local search: adjacent swaps (faster, more targeted)
  const maxIter = n <= 20 ? 400 : 200;
  let improved = true;
  let iter = 0;
  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    for (let i = 0; i < n - 1; i++) {
      adjacentSwap(best, i);
      const ms = makespan(best);
      if (ms < bestMs) {
        bestMs = ms;
        improved = true;
        // Re-scan from start to catch cascading improvements
        i = -1;
      } else {
        adjacentSwap(best, i);
      }
    }
  }

  // Second pass: full pairwise swaps for refinement
  const maxIter2 = n <= 20 ? 60 : 30;
  improved = true;
  iter = 0;
  while (improved && iter < maxIter2) {
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

  return best;
}