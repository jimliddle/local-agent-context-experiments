function solve(times) {
  const n = times.length;
  const m = times[0].length;

  function simulate(order) {
    const finish = new Array(m).fill(0);
    for (let idx = 0; idx < order.length; idx++) {
      const job = order[idx];
      for (let k = 0; k < m; k++) {
        finish[k] += times[job][k];
      }
    }
    return finish[m - 1];
  }

  function computeOrder(rule) {
    const idx = times.map((_, i) => i);
    if (rule === 'SPT') {
      idx.sort((a, b) => {
        const sa = times[a].reduce((s, x) => s + x, 0);
        const sb = times[b].reduce((s, x) => s + x, 0);
        return sb - sa || a - b;
      });
    } else if (rule === 'LPT') {
      idx.sort((a, b) => {
        const sa = times[a].reduce((s, x) => s + x, 0);
        const sb = times[b].reduce((s, x) => s + x, 0);
        return sa - sb || a - b;
      });
    } else if (rule === 'first') {
      idx.sort((a, b) => times[a][0] - times[b][0] || a - b);
    } else if (rule === 'last') {
      idx.sort((a, b) => times[a][m - 1] - times[b][m - 1] || a - b);
    } else if (rule === 'max') {
      idx.sort((a, b) => {
        const ma = Math.max(...times[a]);
        const mb = Math.max(...times[b]);
        return mb - ma || a - b;
      });
    } else if (rule === 'min') {
      idx.sort((a, b) => {
        const ma = Math.min(...times[a]);
        const mb = Math.min(...times[b]);
        return ma - mb || a - b;
      });
    } else if (rule === 'ratio') {
      idx.sort((a, b) => {
        const ra = times[a][0] / times[a][m - 1];
        const rb = times[b][0] / times[b][m - 1];
        return rb - ra || a - b;
      });
    } else if (rule === 'gwo') {
      idx.sort((a, b) => {
        const wa = times[a].reduce((s, x) => s + x * x, 0);
        const wb = times[b].reduce((s, x) => s + x * x, 0);
        return wb - wa || a - b;
      });
    } else if (rule === 'identity') {
      // already sorted by index
    }
    return idx;
  }

  function pairwiseSwap(order, limit) {
    let best = order.slice();
    let bestCost = simulate(best);
    const n = best.length;
    let swaps = 0;
    for (let i = 0; i < n - 1 && swaps < limit; i++) {
      for (let j = i + 1; j < n && swaps < limit; j++) {
        const trial = best.slice();
        const tmp = trial[i];
        trial[i] = trial[j];
        trial[j] = tmp;
        const c = simulate(trial);
        if (c < bestCost) {
          bestCost = c;
          best = trial;
          swaps++;
        }
      }
    }
    return { order: best, cost: bestCost };
  }

  function insertSearch(order) {
    let best = order.slice();
    let bestCost = simulate(best);
    const n = best.length;
    for (let pass = 0; pass < 2; pass++) {
      let improved = false;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const trial = best.slice();
          const el = trial.splice(i, 1)[0];
          trial.splice(j, 0, el);
          const c = simulate(trial);
          if (c < bestCost) {
            bestCost = c;
            best = trial;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
    return { order: best, cost: bestCost };
  }

  const rules = ['SPT', 'LPT', 'first', 'last', 'max', 'min', 'ratio', 'gwo', 'identity'];
  let bestOrder = null;
  let bestCost = Infinity;

  for (const rule of rules) {
    const order = computeOrder(rule);
    const cost = simulate(order);
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = order;
    }
  }

  let result = pairwiseSwap(bestOrder, 15);
  if (result.cost < bestCost) {
    bestCost = result.cost;
    bestOrder = result.order;
  }

  result = insertSearch(bestOrder);
  if (result.cost < bestCost) {
    bestCost = result.cost;
    bestOrder = result.order;
  }

  result = pairwiseSwap(bestOrder, 5);
  if (result.cost < bestCost) {
    bestCost = result.cost;
    bestOrder = result.order;
  }

  return bestOrder;
}