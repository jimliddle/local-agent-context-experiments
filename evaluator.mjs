import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function rng(seed) {
  let x = seed >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
}

export function instances(seed, count) {
  const random = rng(seed);
  return Array.from({ length: count }, (_, k) => {
    const n = 18 + k % 5 * 5, m = 4 + k % 4;
    return Array.from({ length: n }, () => {
      const job = 1 + Math.floor(random() * 70);
      return Array.from({ length: m }, (_, j) => {
        const r = 1 + Math.floor(random() * 99);
        if (k % 3 === 0) return r;
        if (k % 3 === 1) return job + Math.floor(r / 4);
        return j === k % m ? r * 4 : r;
      });
    });
  });
}

export function makespan(times, order) {
  if (!Array.isArray(order) || order.length !== times.length ||
      order.some(x => !Number.isInteger(x) || x < 0 || x >= times.length) ||
      new Set(order).size !== times.length) throw new Error('Not a permutation of every job');
  const done = Array(times[0].length).fill(0);
  for (const job of order) {
    for (let machine = 0; machine < done.length; machine++) {
      done[machine] = Math.max(done[machine], machine ? done[machine - 1] : 0) + times[job][machine];
    }
  }
  return done.at(-1);
}

export const baseline = `function solve(times) {
  return times.map((row, i) => i).sort((a,b) =>
    times[b].reduce((s,x)=>s+x,0)-times[a].reduce((s,x)=>s+x,0) || a-b);
}`;

export function evaluate(code, cases) {
  const scores = [];
  for (let i = 0; i < cases.length; i++) {
    try {
      const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
      // No host objects or functions are passed into the candidate context.
      const order = JSON.parse(vm.runInContext(`"use strict"; Math.random = () => { throw Error('Use deterministic search'); };
        ${code}\nJSON.stringify(solve(${JSON.stringify(cases[i])}));`, context, { timeout: 500 }));
      const value = makespan(cases[i], order);
      const baseOrder = cases[i].map((_, j) => j).sort((a,b) =>
        cases[i][b].reduce((s,x)=>s+x,0)-cases[i][a].reduce((s,x)=>s+x,0) || a-b);
      scores.push({ makespan: value, baseline: makespan(cases[i], baseOrder) });
    } catch (error) {
      return { valid: false, error: String(error.message), failedCase: i, completed: scores.length };
    }
  }
  return { valid: true, score: scores.reduce((sum, x) => sum + x.makespan / x.baseline, 0) / scores.length, cases: scores };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  process.stdout.write(JSON.stringify(evaluate(input.code, instances(input.seed, input.count))));
}
