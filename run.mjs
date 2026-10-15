import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAgentSession, createExtensionRuntime, ModelRuntime, SessionManager, SettingsManager }
  from '@earendil-works/pi-coding-agent';
import { baseline } from './evaluator.mjs';
import { modelConfig } from './config.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const preflight = process.argv.includes('--preflight');
const checkConfig = process.argv.includes('--check-config');
const config = modelConfig();
const label = checkConfig ? 'config-check' : preflight ? 'preflight' : 'run';
const destination = resolve(process.env.CONTEXT_OUTPUT || join(root, 'outputs', `${label}-${Date.now()}`));
if (existsSync(destination)) throw Error('Output directory already exists; choose a new CONTEXT_OUTPUT');
mkdirSync(destination, { recursive: true });
const output = join(destination, 'runs');
mkdirSync(output);
writeFileSync(join(destination, 'models.local.json'), JSON.stringify(config, null, 2));
const runtime = await ModelRuntime.create({
  modelsPath: join(destination, 'models.local.json'),
  authPath: join(output, 'unused-auth.json'),
  modelsStorePath: join(output, 'model-store.json'),
  allowModelNetwork: false, refreshOnCreate: false,
});
const model = runtime.getModel('ollama', config.providers.ollama.models[0].id);
if (!model) throw Error('Local model not registered');
if (checkConfig) {
  console.log('Pi resolved the local model configuration. No inference request was made.');
  process.exit(0);
}
const system = `You optimise a deterministic JavaScript scheduling function. Reply ONLY with the complete function solve(times), optionally in a javascript code fence. No explanations or tools. Fit the complete program in 1536 output tokens.
times[job][machine] contains positive integer processing times. All jobs visit machines in order; each machine handles one job at a time. All machines use the same job permutation. Minimise final completion time (makespan). Return every job index exactly once. Never modify evaluation code or hardcode instances. Function must handle arbitrary 18-40 jobs and 4-7 machines, deterministic, under 500ms per instance. No imports, filesystem, network, Date, or Math.random. Helpers must be inside solve. Preserve a working candidate when improving it.`;
const loader = {
  getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
  getSkills: () => ({ skills: [], diagnostics: [] }),
  getPrompts: () => ({ prompts: [], diagnostics: [] }),
  getThemes: () => ({ themes: [], diagnostics: [] }),
  getAgentsFiles: () => ({ agentsFiles: [] }),
  getSystemPrompt: () => system, getSystemPromptSource: () => undefined,
  getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [],
  extendResources: () => {}, reload: async () => {},
};

async function sessionFor(history = []) {
  const { session } = await createAgentSession({
    cwd: output, agentDir: output, model, modelRuntime: runtime, thinkingLevel: 'off',
    tools: [], noTools: 'all', resourceLoader: loader,
    sessionManager: SessionManager.inMemory(output),
    settingsManager: SettingsManager.inMemory({
      compaction: { enabled: false }, retry: { enabled: false, maxRetries: 0 },
    }),
  });
  session.agent.state.messages = structuredClone(history);
  const original = session.agent.streamFunction;
  session.agent.streamFunction = (m, c, options) => original(m, c, {
    ...options, maxTokens: 1536, temperature: 0.6,
  });
  return session;
}

function grade(code, seed, count) {
  const child = spawnSync(process.execPath, ['--max-old-space-size=128', join(root, 'evaluator.mjs')], {
    input: JSON.stringify({ code, seed, count }), encoding: 'utf8', timeout: 20000, maxBuffer: 1048576,
  });
  if (child.error || child.status !== 0) return { valid: false, error: String(child.error || child.stderr) };
  return JSON.parse(child.stdout);
}

const records = [];
async function attempt(session, state, id, seed) {
  const prompt = `Improve this current best candidate. Development score (mean makespan/baseline, lower better): ${state.score}.
Current code:\n${state.code}\nFactual development ledger:\n${JSON.stringify(state.ledger)}
Propose one complete improved function. Evaluation covers independent instances; optimise generally.`;
  const started = Date.now();
  const dir = join(output, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'request.json'), JSON.stringify({ system, history: session.messages, prompt }, null, 2));
  const unsubscribe = session.subscribe(event => {
    if (event.type === 'message_end') appendFileSync(join(dir, 'messages.jsonl'), JSON.stringify(event.message) + '\n');
  });
  const timer = setTimeout(() => { void session.abort(); }, 600000);
  let error;
  try { await session.prompt(prompt); } catch (e) { error = String(e); }
  finally { clearTimeout(timer); unsubscribe(); }
  const message = session.messages.filter(m => m.role === 'assistant').at(-1);
  const text = message?.content?.filter(c => c.type === 'text').map(c => c.text).join('\n') || '';
  const code = text.trim().replace(/^```(?:javascript|js)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  writeFileSync(join(dir, 'candidate.js'), code);
  const result = error || message?.stopReason === 'error' || message?.stopReason === 'aborted'
    ? { valid: false, error: error || message.errorMessage || message.stopReason }
    : grade(code, seed, 12);
  const accepted = result.valid && result.score < state.score;
  const record = { id, result, accepted, elapsedSeconds: (Date.now() - started) / 1000,
    usage: message?.usage, stopReason: message?.stopReason };
  records.push(record);
  writeFileSync(join(dir, 'result.json'), JSON.stringify(record, null, 2));
  state.ledger.push({ id, ...result, accepted });
  if (accepted) Object.assign(state, { code, score: result.score, selected: id });
  console.log(JSON.stringify({ id, valid: result.valid, score: result.score, accepted,
    elapsedSeconds: record.elapsedSeconds, usage: record.usage, error: result.error }));
  return record;
}

if (preflight) {
  const session = await sessionFor();
  try {
    await attempt(session, { code: baseline, score: 1, ledger: [], selected: 'baseline' }, 'smoke', 555);
    if (!records[0].result.valid) throw Error('Preflight failed; inspect recorded response');
  } finally { session.dispose(); }
  process.exit(0);
}

const results = [];
for (let repeat = 0; repeat < 2; repeat++) {
  const seed = 1701 + repeat * 100;
  const state = { code: baseline, score: 1, ledger: [], selected: 'baseline' };
  const trunk = await sessionFor();
  let history;
  try {
    for (let i = 0; i < 2; i++) await attempt(trunk, state, `r${repeat+1}-warm-${i+1}`, seed);
    history = structuredClone(trunk.messages);
  } finally { trunk.dispose(); }
  const row = { repeat: repeat + 1, seed, warm: structuredClone(state), arms: {} };
  const order = repeat ? ['fork', 'flush', 'continuation'] : ['continuation', 'flush', 'fork'];
  for (const arm of order) {
    const branches = [];
    for (let b = 0; b < (arm === 'fork' ? 2 : 1); b++) {
      const branch = structuredClone(state);
      const session = await sessionFor(arm === 'continuation' ? history : []);
      try {
        for (let i = 0; i < (arm === 'fork' ? 2 : 4); i++) {
          await attempt(session, branch, `r${repeat+1}-${arm}-b${b+1}-${i+1}`, seed);
        }
      } finally { session.dispose(); }
      branches.push(branch);
    }
    branches.sort((a,b) => a.score - b.score);
    row.arms[arm] = { selected: branches[0], branches };
    writeFileSync(join(output, `repeat-${repeat+1}-checkpoint.json`), JSON.stringify(row, null, 2));
  }
  results.push(row);
}

// Lock all selections before evaluating any held-out instances.
writeFileSync(join(output, 'selections.json'), JSON.stringify(results, null, 2));
for (const row of results) {
  const testSeed = 8675309 + row.repeat * 100;
  row.warm.heldout = grade(row.warm.code, testSeed, 24);
  for (const arm of Object.values(row.arms)) arm.heldout = grade(arm.selected.code, testSeed, 24);
}
writeFileSync(join(destination, 'results.json'), JSON.stringify({ model: model.id, protocol: 'PROTOCOL.md', results, records }, null, 2));
console.log('Completed. Results saved in the new output directory.');
