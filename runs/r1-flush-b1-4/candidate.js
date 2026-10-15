function solve(times) {
  const n = times.length;
  const m = times[0].length;

  function makespan(perm) {
    const finish = new Array(m).fill(0);
    for (let j = 0; j < n; j++) {
      const job = perm[j];
      let t = 0;
      for (let k = 0; k < m; k++) {
        t = t > finish[k] ? t : finish[k];
        t += times[job][k];
        finish[k] = t;
      }
    }
    return finish[m - 1];
  }

  function jk(perm) {
    let a = perm[0];
    for (let i = 1; i < n; i++) {
      const b = perm[i];
      if (times[b][m - 1] < times[a][m - 1]) a = b;
    }
    let first = [a];
    const rest = perm.filter(x => x !== a);
    while (rest.length) {
      let best = null, bestVal = Infinity, bestIdx = 0;
      const last = first[first.length - 1];
      for (let i = 0; i < rest.length; i++) {
        const cand = rest[i];
        const v1 = times[last][0];
        const v2 = times[cand][m - 1];
        const val = v1 > v2 ? v1 : v2;
        if (val < bestVal) {
          bestVal = val; best = cand; bestIdx = i;
        }
      }
      first.push(best);
      rest.splice(bestIdx, 1);
    }
    return first;
  }

  function spt() {
    return times.map((row, i) => i).sort((a, b) =>
      times[b].reduce((s, x) => s + x, 0) - times[a].reduce((s, x) => s + x, 0) || a - b);
  }

  function lpt() {
    return times.map((row, i) => i).sort((a, b) =>
      times[a].reduce((s, x) => s + x, 0) - times[b].reduce((s, x) => s + x, 0) || a - b);
  }

  function insertImprove(perm) {
    const p = perm.slice();
    let cur = makespan(p);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < n; i++) {
        const job = p[i];
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const trial = p.slice();
          trial.splice(i, 1);
          trial.splice(j, 0, job);
          const ms = makespan(trial);
          if (ms < cur) {
            p.length = 0;
            for (let k = 0; k < n; k++) p.push(trial[k]);
            cur = ms;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
    return p;
  }

  function swapImprove(perm) {
    const p = perm.slice();
    let cur = makespan(p);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const trial = p.slice();
          const tmp = trial[i]; trial[i] = trial[j]; trial[j] = tmp;
          const ms = makespan(trial);
          if (ms < cur) {
            p.length = 0;
            for (let k = 0; k < n; k++) p.push(trial[k]);
            cur = ms;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
    return p;
  }

  function reverseImprove(perm) {
    const p = perm.slice();
    let cur = makespan(p);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const trial = p.slice();
          for (let a = i, b = j; a < b; a++, b--) {
            const tmp = trial[a]; trial[a] = trial[b]; trial[b] = tmp;
          }
          const ms = makespan(trial);
          if (ms < cur) {
            p.length = 0;
            for (let k = 0; k < n; k++) p.push(trial[k]);
            cur = ms;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
    return p;
  }

  let best = jk(spt());
  let bestMs = makespan(best);

  const cands = [spt(), lpt(), jk(lpt())];
  for (const c of cands) {
    const ms = makespan(c);
    if (ms < bestMs) { bestMs = ms; best = c.slice(); }
  }

  let improved = insertImprove(best);
  let ms2 = makespan(improved);
  if (ms2 < bestMs) { bestMs = ms2; best = improved; }

  improved = swapImprove(best);
  ms2 = makespan(improved);
  if (ms2 < bestMs) { bestMs = ms2; best = improved; }

  improved = reverseImprove(best);
  ms2 = makespan(improved);
  if (ms2 < bestMs) { bestMs = ms2; best = improved; }

  improved = insertImprove(best);
  ms2 = makespan(improved);
  if (ms2 < bestMs) { bestMs = ms2; best = improved; }

  improved = swapImprove(best);
  ms2 = makespan(improved);
  if (ms2 < bestMs) { bestMs = ms2; best = improved; }

  return best;
}