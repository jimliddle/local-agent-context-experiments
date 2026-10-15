import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { instances } from './evaluator.mjs';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const inputDirectory = args.find(arg => arg !== '--check');
const root = inputDirectory ? resolve(inputDirectory) : dirname(fileURLToPath(import.meta.url));
const pilot = existsSync(join(root, 'evidence-sha256.json'));
const data = JSON.parse(readFileSync(join(root, 'results.json'), 'utf8'));
const arms = ['continuation', 'flush', 'fork'];
const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
assert.equal(data.records.length, 28);
const audit = [];
for (const record of data.records) {
  const messages = readFileSync(join(root, 'runs', record.id, 'messages.jsonl'), 'utf8')
    .trim().split('\n').map(line => JSON.parse(line));
  assert.equal(messages.filter(m => m.role === 'assistant').length, 1);
  assert.ok(record.usage.output <= 1536);
  assert.equal(record.usage.reasoning || 0, 0);
}
audit.push('All 28 attempts have exactly one recorded assistant response, no reported reasoning tokens, and at most 1,536 output tokens.');

// An independent full completion-time matrix checks the rolling-array scorer.
function matrixMakespan(times, order) {
  const end = Array.from({ length: order.length + 1 }, () => Array(times[0].length + 1).fill(0));
  for (let i = 1; i <= order.length; i++) {
    for (let j = 1; j <= times[0].length; j++) {
      end[i][j] = Math.max(end[i-1][j], end[i][j-1]) + times[order[i-1]][j-1];
    }
  }
  return end.at(-1).at(-1);
}

function checkHeldout(code, seed, expected) {
  if (!expected.valid) return;
  const cases = instances(seed, 24);
  for (let i = 0; i < cases.length; i++) {
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    const order = JSON.parse(vm.runInContext(`"use strict"; ${code}\nJSON.stringify(solve(${JSON.stringify(cases[i])}));`, context, { timeout: 500 }));
    assert.equal(new Set(order).size, cases[i].length);
    assert.equal(matrixMakespan(cases[i], order), expected.cases[i].makespan);
  }
}

for (const row of data.results) {
  for (const arm of arms) {
    const records = data.records.filter(r => r.id.startsWith(`r${row.repeat}-${arm}-`));
    assert.equal(records.length, 4);
    const first = read(`runs/${records[0].id}/request.json`);
    assert.equal(first.history.length, arm === 'continuation' ? 4 : 0);
    if (arm === 'fork') {
      const second = read(`runs/r${row.repeat}-fork-b2-1/request.json`);
      assert.equal(second.history.length, 0);
      assert.equal(second.prompt, first.prompt);
    }
    const selected = row.arms[arm].selected;
    assert.equal(selected.score, Math.min(row.warm.score, ...records.filter(r => r.result.valid).map(r => r.result.score)));
    for (const branch of row.arms[arm].branches) {
      let best = 1;
      for (const entry of branch.ledger) {
        assert.equal(entry.accepted, Boolean(entry.valid && entry.score < best));
        if (entry.accepted) best = entry.score;
      }
      assert.equal(branch.score, best);
    }
    checkHeldout(selected.code, 8675309 + row.repeat * 100, row.arms[arm].heldout);
  }
  checkHeldout(row.warm.code, 8675309 + row.repeat * 100, row.warm.heldout);
  audit.push(`Repeat ${row.repeat}: histories, attempt budgets, selection, incumbent protection, and independent held-out makespans checked.`);
}

const mean = values => values.reduce((a,b) => a+b, 0) / values.length;
const pct = n => Number.isFinite(n) ? `${(n*100).toFixed(2)}%` : 'INVALID';
const rows = [];
const totals = {};
for (const arm of arms) {
  const records = data.records.filter(r => r.id.includes(`-${arm}-`));
  const improvement = data.results.map(row => row.arms[arm].heldout.valid && row.warm.heldout.valid
    ? 1 - row.arms[arm].heldout.score / row.warm.heldout.score : NaN);
  totals[arm] = {
    attempts: records.length, accepted: records.filter(r=>r.accepted).length,
    invalid: records.filter(r=>!r.result.valid).length,
    rejectedValid: records.filter(r=>r.result.valid&&!r.accepted).length,
    inputTokens: records.reduce((s,r)=>s+(r.usage?.input||0)+(r.usage?.cacheRead||0)+(r.usage?.cacheWrite||0),0),
    cachedInputTokens: records.reduce((s,r)=>s+(r.usage?.cacheRead||0),0),
    outputTokens: records.reduce((s,r)=>s+(r.usage?.output||0),0),
    seconds: records.reduce((s,r)=>s+r.elapsedSeconds,0),
    meanHeldoutImprovementOverWarm: mean(improvement),
  };
  rows.push(`| ${arm} | ${improvement.map(pct).join(' | ')} | ${pct(mean(improvement))} |`);
}
const counts = arms.map(a => {
  const t = totals[a];
  return `| ${a} | ${t.accepted}/${t.attempts} | ${t.invalid} | ${t.rejectedValid} | ${t.inputTokens} (${t.cachedInputTokens} cached) | ${t.outputTokens} | ${(t.seconds/60).toFixed(1)} |`;
});
const raw = data.results.flatMap(row => arms.map(arm =>
  `| ${row.repeat} | ${arm} | ${row.warm.score.toFixed(6)} | ${row.arms[arm].selected.score.toFixed(6)} | ${row.warm.heldout.score.toFixed(6)} | ${row.arms[arm].heldout.score?.toFixed(6) ?? 'INVALID'} | ${row.arms[arm].selected.selected} |`));
const failures = data.records.filter(r => !r.result.valid).map(r =>
  `| ${r.id} | ${r.stopReason === 'length' ? 'Output cap reached' : 'Format or program error'} | ${r.result.error.replaceAll('|', '/').replaceAll('\n', ' ')} |`);
const assessment = pilot ? `A fresh conversation won the first repeat. Continuation won the second.
Two fresh branches used fewer tokens and less time, but won neither repeat.

In repeat 1, the model kept using a calculation that ignored machine dependencies.
The evaluator rejected these proposals as improvements, so the baseline remained
the best available program. A fresh conversation produced a correct calculation
and an improvement that held up on unseen cases.

Repeat 2 started with working code. Continuation eventually improved it most.
The single fresh conversation returned to the same runtime error on three
attempts. One continuation response hit the output cap; its next attempt worked.

A fresh conversation is worth trying when a coding run is stuck, provided the
best working code is kept and changes can be checked. These results give no
reason to enable branching by default or change compaction. More tasks and
larger budgets are needed before making that decision. The mean below is heavily
affected by the first repeat so it is not an estimate of the gain to expect on
other work.` : `This report audits a new run using the Pilot 1 protocol. Its results are
separate from the published pilot. Inspect the candidates and per-repeat scores
before drawing conclusions; this script does not infer why an approach won.`;
const report = `# ${pilot ? 'Pilot 1 results' : 'New run results'}

Model: ${data.model}. Pi SDK: 0.84.2. Thinking: off.
Two repeats of one synthetic scheduling task, with 28 model calls in total.

## Findings

${assessment}

## Held-out results

Improvement in scheduling score against the shared warm up program on unseen
cases. Positive is better. This is neither an accuracy score nor a measure of
distance from the optimal schedule.

| Approach | Repeat 1 | Repeat 2 | Mean |
|---|---:|---:|---:|
${rows.join('\n')}

## Cost and rejected attempts

Each approach had four attempts per repeat. The table excludes the four shared
warm up calls and any preflight calls. Input counts include cached tokens, shown
separately in parentheses. Time includes inference and development evaluation.
Matching attempt counts did not match compute use.

| Approach | Accepted/attempts | Invalid | Valid but not better | Input tokens | Output tokens | Minutes |
|---|---:|---:|---:|---:|---:|---:|
${counts.join('\n')}

## Raw scores and selections

For each case, divide the candidate's makespan by the baseline's makespan, then
take the mean of those ratios. Lower is better, the baseline scores 1.

| Repeat | Approach | Warm dev | Final dev | Warm held-out | Final held-out | Selected candidate |
|---|---|---:|---:|---:|---:|---|
${raw.join('\n')}

## Failed candidates

These attempts failed and did not replace the best working program. Warm up
failures are included. A response cut off by the token cap might have worked
with more room, this test cannot say.

| Candidate | Category | Evaluator error |
|---|---|---|
${failures.join('\n')}

## Audit

${audit.map(x=>'- '+x).join('\n')}
- Final programs were selected before held-out evaluation. The model could not read the evaluator or use tools, MCP servers or skills.
- Evaluator unit tests are separate from this audit. Run them with the commands in the README.
${pilot ? '- The initial preflight was blocked by localhost permissions and generated no tokens. A permitted retry succeeded. A process-list diagnostic was also blocked. These failures were outside the attempt budget; preflight and authentication files are excluded from this release.' : ''}

## Limitations

One task, two repeats and short conversations cannot establish which approach
usually works best. The held-out cases use the same generator as the development
cases, so this tests new instances rather than new kinds of work.

Two branches get fewer attempts each than one continuing conversation. The
output cap, caching and response lengths also affect the comparison. These runs
use thinking-off and no tools or skills; they say nothing about research,
writing, RAG or long-session compaction. Inference seeds were not fixed.

## Files

The protocol is in PROTOCOL.md in the release directory. Requests, responses and
candidates are in runs/ beside this report. Numerical results are in results.json.
The audit code is analyse.mjs.
`;
if (!checkOnly) {
  writeFileSync(join(root, 'REPORT.md'), report);
  writeFileSync(join(root, 'audit.json'), JSON.stringify({ checks: audit, totals }, null, 2));
}
console.log(report);
