export function modelConfig(env = process.env) {
  const endpoint = new URL(env.CONTEXT_ENDPOINT || 'http://127.0.0.1:11434/v1');
  if (!['http:', 'https:'].includes(endpoint.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw Error('Use a loopback HTTP endpoint without credentials, query parameters or fragments');
  }
  const id = (env.CONTEXT_MODEL || 'qwen38-27b-q8-coding').trim();
  if (!id || /[\r\n]/.test(id)) throw Error('CONTEXT_MODEL must be a nonempty model ID');
  return { providers: { ollama: {
    baseUrl: endpoint.href.replace(/\/$/, ''), api: 'openai-completions', apiKey: 'ollama',
    compat: {
      supportsStore: false, supportsDeveloperRole: false, supportsReasoningEffort: true,
      supportsUsageInStreaming: true, supportsStrictMode: false,
      maxTokensField: 'max_tokens', thinkingFormat: 'openai',
    },
    models: [{ id, name: id, reasoning: true, input: ['text'], contextWindow: 262144,
      maxTokens: 32768, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      samplingParams: { temperature: 0.6, top_p: 0.95, top_k: 20, min_p: 0 },
      thinkingLevelMap: { off: 'none', minimal: null, low: 'low', medium: 'medium',
        high: 'high', xhigh: null, max: null },
    }],
  } } };
}
