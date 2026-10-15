import test from 'node:test';
import assert from 'node:assert/strict';
import { baseline, evaluate, instances, makespan } from './evaluator.mjs';

test('known two-machine makespans', () => {
  assert.equal(makespan([[2,3],[4,1]], [0,1]), 7);
  assert.equal(makespan([[2,3],[4,1]], [1,0]), 9);
});
test('invalid permutations rejected', () => {
  for (const order of [[0,0], [0], [0,2], [0,0.5]]) {
    assert.throws(() => makespan([[2,3],[4,1]], order));
  }
});
test('baseline score is exactly one', () => {
  assert.equal(evaluate(baseline, instances(112, 12)).score, 1);
});
test('generators are reproducible and held-out differs', () => {
  assert.deepEqual(instances(100, 12), instances(100, 12));
  assert.notDeepEqual(instances(100, 12), instances(101, 12));
});
test('candidate cannot mutate evaluator inputs', () => {
  const data = [[[2,3],[4,1]]];
  const result = evaluate('function solve(t){ t[0][0]=0; return [0,1]; }', data);
  assert.equal(result.cases[0].makespan, 7);
  assert.equal(data[0][0][0], 2);
});
test('nontermination is bounded', () => {
  assert.equal(evaluate('function solve(){while(true){}}', [[[1]]]).valid, false);
});
test('no process access or dynamic code generation', () => {
  assert.equal(evaluate('function solve(){return process.env;}', [[[1]]]).valid, false);
  assert.equal(evaluate('function solve(){return Function("return [0]")();}', [[[1]]]).valid, false);
});
