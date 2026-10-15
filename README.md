# Local agent context experiments

This repository contains a small test of whether a coding model make better progress when it starts a new conversation from
its best working code,
using a local Qwen model, and a scheduling problem, with a numerical score.

## Pilot 1: fresh context, continuation and two branches

Each repeat began with two warm up attempts. From the same checkpoint, the model
then tried three approaches: continue the conversation, start a fresh one, or
start two fresh branches. Each approach had four attempts in total. The best
program was chosen using development cases, then scored on unseen cases.

| Approach | Improvement in repeat 1 | Improvement in repeat 2 |
|---|---:|---:|
| Continue the conversation | 0.00% | 0.74% |
| Start a fresh conversation | 8.47% | 0.00% |
| Start two fresh branches | 6.89% | 0.38% |

The percentages measure improvement in the scheduling score against each
repeat's starting program, higher is better (they are not accuracy scores).

Fresh context helped in the first repeat, where continuation kept returning to
an incorrect calculation. Continuation won the second repeat, which started
with working code. Two branches used fewer tokens and less time, but won neither
repeat (wo runs of one task are too few to recommend a default strategy).

The experiment was prompted by
[Fork-and-Flush: Escaping Idea Basins in Autoresearch Agents](https://arxiv.org/abs/2610.07447).
It uses shorter runs and two branches rather than the paper's four. It does not
test long session compaction or reproduce the paper's compute budget comparison.

Read the [results](REPORT.md) and [protocol](PROTOCOL.md) for costs, failures and
limitations. The [publication notes](PUBLICATION.md) describe the privacy review
and which files were changed for this release.

## Check the recorded results

The evaluator and audit use Node's standard library. They do not need a model,
an API key or a package installation. The original run used Node 26.0.0 and Pi
SDK 0.84.2. Other Node versions have not been tested.

```sh
node --test evaluator.test.mjs publication.test.mjs
node analyse.mjs
```

The first command tests the evaluator and checks the evidence hashes. The second
checks conversation histories, attempt counts and candidate selection, then
recalculates the held out scores with a separate implementation. It writes
`REPORT.md` and `audit.json`; it does not change the recorded results.

The audit executes the included candidate programs in a Node VM with timeouts.
These are synthetic experiment outputs (this is not a secure environment for
arbitrary code from an untrusted source).

## Run a new experiment

Install the pinned Pi SDK dependency with `npm install`. Start an Ollama compatible
server on loopback with an existing model, then set its model ID:

```sh
export CONTEXT_MODEL=your-local-model-id
export CONTEXT_ENDPOINT=http://127.0.0.1:11434/v1
node run.mjs --check-config
node run.mjs --preflight
node run.mjs
```

No model is downloaded by these commands. New results go in a separate directory
under `outputs/`, leaving Pilot 1 unchanged. Set `CONTEXT_OUTPUT` to choose another
new directory. The runner refuses to overwrite an existing directory.

The runner requests thinking off through the OpenAI-compatible reasoning setting.
Check that the server supports this before comparing results. The recorded model
ID, `qwen38-27b-q8-coding`, was a local alias, not a model download address. The
original weights are not distributed here, so the exact model setup is a
reproduction limitation. The archived scores can still be audited without it.

New runs use the same task, seeds, prompts, selection rules and attempt limits.
To audit one, pass its output directory to `node analyse.mjs`. A different model
or server should be reported as a separate experiment, not a rerun of Pilot 1.

The harness code is MIT licensed. No model weights or third-party SDK source are
included. See [NOTICE](NOTICE) for attribution.
