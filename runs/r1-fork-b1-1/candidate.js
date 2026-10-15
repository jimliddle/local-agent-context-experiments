function solve(times) {
  const n = times.length;
  const m = times[0].length;

  function makespan(order) {
    const c = new Array(m).fill(0);
    for (const j of order) {
      const row = times[j];
      for (let i = 0; i < m; i++) {
        c[i] = Math.max(c[i], c[i - 1] || 0) + row[i];
      }
    }
    return c[m - 1];
  }

  function pairwiseCost(a, b) {
    // cost of having a before b
    let ca = 0, cb = 0;
    for (let i = 0; i < m; i++) {
      const ta = times[a][i], tb = times[b][i];
      ca = Math.max(ca, (i > 0 ? ca : 0)) + ta;
      cb = Math.max(cb, (i > 0 ? cb : 0)) + tb;
    }
    return ca;
  }

  // Johnson's rule for 2 machines
  function johnson2(first, second) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(i);
    arr.sort((a, b) => {
      const ma = Math.min(times[a][first], times[a][second]);
      const mb = Math.min(times[b][first], times[b][second]);
      return ma - mb || a - b;
    });
    return arr;
  }

  // Build initial order with Johnson on first two machines
  let order = johnson2(0, 1);

  // Improve with pairwise swaps
  let best = makespan(order);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
        const ms = makespan(order);
        if (ms < best) {
          best = ms;
          improved = true;
        } else {
          order[j] = order[i];
          order[i] = tmp;
        }
      }
    }
  }

  // 2-opt style: try reversing segments
  improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        for (let k = i; k <= (i + j) / 2; k++) {
          const l = i + j - k;
          const tmp = order[k];
          order[k] = order[l];
          order[l] = tmp;
        }
        const ms = makespan(order);
        if (ms < best) {
          best = ms;
          improved = true;
        } else {
          for (let k = i; k <= (i + j) / 2; k++) {
            const l = i + j - k;
            const tmp = order[k];
            order[k] = order[l];
            order[l] = tmp;
          }
        }
      }
    }
  }

  return order;
}