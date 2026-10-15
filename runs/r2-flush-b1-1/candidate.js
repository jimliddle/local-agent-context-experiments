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

  // 2-opt: reverse segments
  function reverseSegment(arr, i, j) {
    while (i < j) {
      swap(arr, i, j);
      i++;
      j--;
    }
  }

  // Local search: swaps + segment reversals
  const maxIter = n <= 20 ? 400 : 200;
  let improved = true;
  let iter = 0;
  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    // Swap pass
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
    // 2-opt pass
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        reverseSegment(best, i, j);
        const ms = makespan(best);
        if (ms < bestMs) {
          bestMs = ms;
          improved = true;
        } else {
          reverseSegment(best, i, j);
        }
      }
    }
  }

  return best;
}