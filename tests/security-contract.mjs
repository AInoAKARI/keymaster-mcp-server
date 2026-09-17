import fs from 'node:fs';
import assert from 'node:assert/strict';

const tools = fs.readFileSync(new URL('../src/tools.ts', import.meta.url), 'utf8');
assert.match(tools, /"discover_capabilities"/);
assert.match(tools, /"execute_capability"/);
assert.match(tools, /"capability_health"/);
assert.doesNotMatch(tools, /"get_api_key"/);
assert.doesNotMatch(tools, /"list_api_keys"/);
assert.doesNotMatch(tools, /api_key:\s*value/);
console.log('PASS: MCP surface exposes capabilities, not raw secrets');
