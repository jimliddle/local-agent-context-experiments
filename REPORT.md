# Pilot 1 results

Model: qwen38-27b-q8-coding. Pi SDK: 0.84.2. Thinking: off.
Two repeats of one synthetic scheduling task, with 28 model calls in total.

## Findings

A fresh conversation won the first repeat. Continuation won the second.
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
other work.

## Held-out results

Improvement in scheduling score against the shared warm up program on unseen
cases. Positive is better. This is neither an accuracy score nor a measure of
distance from the optimal schedule.

| Approach | Repeat 1 | Repeat 2 | Mean |
|---|---:|---:|---:|
| continuation | 0.00% | 0.74% | 0.37% |
| flush | 8.47% | 0.00% | 4.23% |
| fork | 6.89% | 0.38% | 3.63% |

## Cost and rejected attempts

Each approach had four attempts per repeat. The table excludes the four shared
warm up calls and any preflight calls. Input counts include cached tokens, shown
separately in parentheses. Time includes inference and development evaluation.
Matching attempt counts did not match compute use.

| Approach | Accepted/attempts | Invalid | Valid but not better | Input tokens | Output tokens | Minutes |
|---|---:|---:|---:|---:|---:|---:|
| continuation | 1/8 | 1 | 6 | 54733 (46013 cached) | 10220 | 10.5 |
| flush | 2/8 | 3 | 3 | 40018 (29270 cached) | 9806 | 10.1 |
| fork | 3/8 | 1 | 4 | 15929 (10101 cached) | 7302 | 7.5 |

## Raw scores and selections

For each case, divide the candidate's makespan by the baseline's makespan, then
take the mean of those ratios. Lower is better, the baseline scores 1.

| Repeat | Approach | Warm dev | Final dev | Warm held-out | Final held-out | Selected candidate |
|---|---|---:|---:|---:|---:|---|
| 1 | continuation | 1.000000 | 1.000000 | 1.000000 | 1.000000 | baseline |
| 1 | flush | 1.000000 | 0.912623 | 1.000000 | 0.915310 | r1-flush-b1-2 |
| 1 | fork | 1.000000 | 0.926500 | 1.000000 | 0.931100 | r1-fork-b1-1 |
| 2 | continuation | 0.933699 | 0.924802 | 0.922004 | 0.915191 | r2-continuation-b1-4 |
| 2 | flush | 0.933699 | 0.933699 | 0.922004 | 0.922004 | r2-warm-2 |
| 2 | fork | 0.933699 | 0.927480 | 0.922004 | 0.918502 | r2-fork-b2-2 |

## Failed candidates

These attempts failed and did not replace the best working program. Warm up
failures are included. A response cut off by the token cap might have worked
with more room, this test cannot say.

| Candidate | Category | Evaluator error |
|---|---|---|
| r1-fork-b1-2 | Format or program error | Not a permutation of every job |
| r2-warm-1 | Format or program error | Unexpected identifier 'need' |
| r2-flush-b1-2 | Format or program error | Cannot read properties of undefined (reading '0') |
| r2-flush-b1-3 | Format or program error | Cannot read properties of undefined (reading '0') |
| r2-flush-b1-4 | Format or program error | Cannot read properties of undefined (reading '0') |
| r2-continuation-b1-3 | Output cap reached | Unexpected identifier 'JSON' |

## Audit

- All 28 attempts have exactly one recorded assistant response, no reported reasoning tokens, and at most 1,536 output tokens.
- Repeat 1: histories, attempt budgets, selection, incumbent protection, and independent held-out makespans checked.
- Repeat 2: histories, attempt budgets, selection, incumbent protection, and independent held-out makespans checked.
- Final programs were selected before held-out evaluation. The model could not read the evaluator or use tools, MCP servers or skills.
- Evaluator unit tests are separate from this audit. Run them with the commands in the README.
- The initial preflight was blocked by localhost permissions and generated no tokens. A permitted retry succeeded. A process-list diagnostic was also blocked. These failures were outside the attempt budget; preflight and authentication files are excluded from this release.

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
