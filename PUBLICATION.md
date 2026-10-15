# Publication notes

This copy was prepared separately from the original experiment directory.

## Included files

`results.json`, the selection checkpoints, all 28 requests and responses, candidate
programs and per-attempt scores were copied without changes. Their SHA-256 hashes
are listed in `evidence-sha256.json`. The publication tests check those hashes.

The evidence contains only the synthetic scheduling task. It does not contain
source manuscripts, personal conversations or unrelated project files. Model
timestamps and response IDs remain in the record. They are local run metadata,
not credentials.

## Exclusions and edits

Authentication files, local configuration, model stores and preflight directories
were excluded using an explicit file list. The public runner uses a package import
and a configurable loopback endpoint instead of paths into a particular machine.
New runs write to a separate output directory. These packaging changes were made
after Pilot 1; they were not used to produce its results.

The README, protocol and report were edited to remove repetition, chat commentary
and vague wording. The report generator received the same edits so regenerating
the report does not restore the old prose. Prompts, model outputs, selected code,
scores and the recorded audit conclusions were not rewritten to change their
meaning or make the model's work look better.

The privacy scan checks the whole release tree for home-directory paths, email
addresses, common credential formats and accidentally included local files. Such
a scan is a check, not proof that arbitrary future files are safe to publish.
New experiment outputs are ignored by Git and require a separate review.

## Validation

Eleven evaluator and publication tests passed. The scoring audit passed on the
release copy, and all 116 evidence files were compared with the original files.
The evaluator and its original tests are also unchanged.

The packaged runner resolved its configuration against the installed Pi SDK
0.84.2 without making an inference request. A clean npm installation and a new
end-to-end model run have not been tested. The dependency version is pinned, but
there is no lockfile for its transitive dependencies. The original run remains
the source of the published results.
