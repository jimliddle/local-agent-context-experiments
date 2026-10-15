function solve(times) {
  const n = times.length;
  const m = times[0].length;

  function makespan(order) {
    const c = new Array(m).fill(0);
    for (let idx = 0; idx < order.length; idx++) {
      const j = order[idx];
      const row = times[j];
      for (let i = 0; i < m; i++) {
        c[i] = (i > 0 ? Math.max(c[i], c[i - 1]) : 0) + row[i];
      }
    }
    return c[m - 1];
  }

  function johnson2(a, b) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(i);
    arr.sort((x, y) => {
      const mx = Math.min(times[x][a], times[x][b]);
      const my = Math.min(times[y][a], times[y][b]);
      return mx - my || x - y;
    });
    return arr;
  }

  function lnsImprove(order) {
    let best = makespan(order);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < n; i++) {
        const j = order[i];
        for (let k = 0; k < n; k++) {
          if (k === i) continue;
          const tmp = order[i];
          for (let t = i; t < k; t++) order[t] = order[t + 1];
          order[k] = tmp;
          const ms = makespan(order);
          if (ms < best) {
            best = ms;
            improved = true;
          } else {
            order[k] = order[i];
            for (let t = k; t > i; t--) order[t] = order[t - 1];
            order[i] = tmp;
          }
        }
      }
    }
    return best;
  }

  let bestOrder = null;
  let bestMs = Infinity;

  // Try Johnson on several machine pairs
  const pairs = [[0, 1], [0, m - 1], [m - 2, m - 1], [0, 0]];
  for (let p = 0; p < pairs.length; p++) {
    const [a, b] = pairs[p];
    let ord;
    if (a === b) {
      ord = [];
      for (let i = 0; i < n; i++) ord.push(i);
      ord.sort((x, y) => {
        let sx = 0, sy = 0;
        for (let i = 0; i < m; i++) { sx += times[x][i]; sy += times[y][i]; }
        return sy - sx || x - y;
      });
    } else {
      ord = johnson2(a, b);
    }
    const ms = lnsImprove(ord);
    if (ms < bestMs) {
      bestMs = ms;
      bestOrder = ord.slice();
    }
  }

  // Also try SPT and LPT
  {
    let ord = [];
    for (let i = 0; i < n; i++) ord.push(i);
    ord.sort((x, y) => {
      let sx = 0, sy = 0;
      for (let i = 0; i < m; i++) { sx += times[x][i]; sy += times[y][i]; }
      return sx - sy || x - y;
    });
    const ms = lnsImprove(ord);
    if (ms < bestMs) { bestMs = ms; bestOrder = ord.slice(); }
  }
  {
    let ord = [];
    for (let i = 0; i < n; i++) ord.push(i);
    ord.sort((x, y) => {
      let sx = 0, sy = 0;
      for (let i = 0; i < m; i++) { sx += times[x][i]; sy += times[y][i]; }
      return sy - sx || x - y;
    });
    const ms = lnsImprove(ord);
    if (ms < bestMs) { bestMs = ms; bestOrder = ord.slice(); }
  }

  return bestOrder;
}