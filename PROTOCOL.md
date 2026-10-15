# Pilot 1 protocol

Run date: 15 October 2026. The protocol was written before the model calls and
edited for publication afterwards. It was not publicly preregistered.

## Task and model

The AI model wrote a JavaScript function, `solve(times)`, that returned an ordering
of jobs for a permutation flow shop. Each job visits the machines in sequence;
all machines use the same job order. The objective is to finish the last job as
early as possible. An external evaluator checks that every job appears exactly
once and calculates the finishing time, or makespan.

Pilot 1 used the local alias `qwen38-27b-q8-coding` through an Ollama compatible
endpoint and Pi SDK 0.84.2. Thinking was off and temperature was 0.6. The configured
sampling settings were top-p 0.95, top-k 20 and min-p 0. The client model definition
declared a 262,144-token context window. The conversations were much shorter.
Inference seeds were not fixed.

The experiment used a stripped down Pi session with no tools, skills, project
instructions, external services or automatic compaction. The model received the
task instructions, current best code and development results. It could not read
the evaluator or held-out cases. The harness and documentation were prepared
with AI assistance. Recorded model responses have not been edited for style.

## Starting point and attempt budgets

There were two repeats, each with a different set of development instances.
Each started with a program that sorted jobs by descending total processing time.
The model had two warm-up attempts to improve it.

All three approaches then received the same best warm-up program and score
history:

| Approach | Conversation history | Further attempts |
|---|---|---:|
| Continuation | Retain the warm-up conversation | 4 |
| Flush | Start a fresh conversation | 4 |
| Fork-and-flush | Start two separate fresh conversations | 2 per branch |

Branches ran sequentially. The better branch was chosen by development score.
The order was continuation, flush, fork in repeat 1 and fork, flush, continuation
in repeat 2. This reduces one possible run-order effect but does not eliminate
differences in caching or system load.

Each request had a 1,536-output-token cap and a ten minute timeout, with retries
disabled. Failed attempts and proposals that were no better still consumed an
attempt. Only a strictly better, valid proposal replaced the current best code.
The shared warm up accounted for four calls across the two repeats, followed by
24 comparison calls. A separate successful preflight was outside that budget.

Attempt counts and output caps matched. Actual token use, cache reuse and elapsed
time did not. This was not an equal-compute experiment.

## Cases and scoring

Each repeat used 12 development cases and 24 held out cases. The generator varies
job counts, machine counts and processing-time patterns. Development seeds were
1701 and 1801; held out seeds were 8675409 and 8675509. All cases are synthetic.

For each case, the evaluator divides the candidate's makespan by the baseline's
makespan. The score is the mean of these ratios. Lower is better, and the baseline
scores exactly 1. This measures improvement over a simple baseline, not distance
from an optimal schedule.

All final selections were saved before any held-out evaluation. Held-out feedback
was not sent to the model or used to select a program. The report's improvement
percentage is `100 * (1 - final_score / warmup_score)` on held-out cases.

## Execution limits and failures

Each candidate ran in a separate Node process with a 128 MiB heap limit. Each
case used a fresh VM context, a 500 ms timeout and disabled string and WASM code
generation. No filesystem or network APIs were exposed to the candidate. These
limits contain this synthetic test; they are not a security guarantee for
hostile code. Model output was accepted as code or a single surrounding code
fence. Additional prose could therefore cause a format failure.

The first preflight could not connect to localhost because of execution-sandbox
permissions. It generated no tokens. A permitted retry succeeded. A process-list
diagnostic was also blocked. Neither diagnostic failure counted as a model
attempt. Authentication files and preflight artefacts are excluded from this
release; all 28 comparison and warm-up attempts are included.

## Limits of the result

This tests one short optimisation task, one model configuration and two repeats.
It does not test document research, writing, RAG, tool use or long session
compaction. Held out cases came from the same generator as the development cases,
so they test new instances of this task rather than transfer to other tasks.

The two branch approach gives each branch less time to improve. The output cap
also cut off one continuation response. Larger budgets could change the result.
The original model alias and unfixed inference seeds limit exact reproduction.
The record supports auditing what happened, not a general estimate of how often
fresh context will help.
