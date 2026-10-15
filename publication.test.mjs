import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelConfig } from './config.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'evidence-sha256.json'), 'utf8'));
const releaseFiles = new Set([
  ...Object.keys(manifest), 'README.md', 'PROTOCOL.md', 'PUBLICATION.md', 'REPORT.md',
  'NOTICE', 'LICENSE', '.gitignore', 'package.json', 'package-lock.json',
  'run.mjs', 'analyse.mjs', 'config.mjs', 'evaluator.mjs', 'evaluator.test.mjs',
  'publication.test.mjs', 'evidence-sha256.json', 'audit.json',
]);

function releaseTree(directory = root, prefix = '') {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    if (!prefix && ['node_modules', 'outputs', '.git'].includes(entry.name)) continue;
    const path = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `Unexpected symlink: ${path}`);
    if (entry.isDirectory()) files.push(...releaseTree(join(directory, entry.name), path + '/'));
    else files.push(path);
  }
  return files;
}

test('all 116 evidence files match their recorded hashes', () => {
  assert.equal(Object.keys(manifest).length, 116);
  for (const [path, expected] of Object.entries(manifest)) {
    assert.ok(path.split('/').every(part => part !== '..') && !path.startsWith('/'));
    assert.equal(createHash('sha256').update(readFileSync(join(root, path))).digest('hex'), expected, path);
  }
});

test('release contains only reviewed paths and no common private identifiers', () => {
  const patterns = [
    new RegExp('/(?:Users|home)/[^\\s/]+', 'i'),
    /[A-Z]:\\Users\\[^\\\s]+/i,
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
    /\b(?:sk-|ghp_|github_pat_)[a-z0-9_-]{20,}/i,
    /Bearer\s+[a-z0-9._-]{20,}/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];
  for (const path of releaseTree()) {
    assert.ok(releaseFiles.has(path), `Unreviewed release file: ${path}`);
    const content = readFileSync(join(root, path), 'utf8');
    for (const pattern of patterns) assert.ok(!pattern.test(content), `Privacy pattern in ${path}: ${pattern}`);
  }
});

test('publication prose has no hidden characters or leftover chat markers', () => {
  for (const path of ['README.md', 'PROTOCOL.md', 'PUBLICATION.md', 'REPORT.md', 'NOTICE']) {
    const text = readFileSync(join(root, path), 'utf8');
    assert.ok(!/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/.test(text), path);
    assert.ok(!/\b(?:as an ai language model|if you(?:'d)? like|here's the kicker)\b/i.test(text), path);
  }
});

test('model config stays on loopback and has no endpoint credentials', () => {
  for (const endpoint of ['http://localhost:11434/v1', 'http://127.0.0.1:11434/v1', 'http://[::1]:11434/v1']) {
    const config = modelConfig({ CONTEXT_ENDPOINT: endpoint, CONTEXT_MODEL: 'local-test-model' });
    assert.equal(config.providers.ollama.models[0].id, 'local-test-model');
  }
  for (const endpoint of ['https://example.com/v1', 'http://user:pass@localhost/v1', 'file:///tmp/model',
    'http://localhost/v1?secret=value', 'http://localhost/v1#fragment']) {
    assert.throws(() => modelConfig({ CONTEXT_ENDPOINT: endpoint }));
  }
  assert.throws(() => modelConfig({ CONTEXT_MODEL: '   ' }));
});
