# AIﾉアカリ☆ Capability Gateway 2026

Status: ACTIVE DESIGN CONTRACT
Date: 2026-09-18

## Decision

AKARI-VAULT-KEYMASTER is not retired. The Vault-backed secret plane remains the root of trust, but the agent-facing contract changes from **secret retrieval** to **capability execution**.

The current `get_api_key` MCP tool is legacy compatibility only. New AIﾉアカリ☆ agents MUST NOT depend on receiving raw provider credentials.

## Target contract

Agent -> capability discovery -> scoped execute request -> Keymaster/Capability Gateway -> provider credential used server-side -> provider/API -> sanitized result -> Agent

Agents hold tickets/identity and capability grants, not provider secrets.

## Core tools

### `discover_capabilities`
Returns capability metadata only:
- capability id
- provider class
- actions
- cost class / existing-credit class
- human-gate requirement
- executor health
- scopes required

Never returns provider credentials.

### `execute_capability`
Input:
- capability id
- action
- bounded payload
- requested scope
- idempotency key when applicable

Gateway:
1. validates agent/ticket
2. checks capability policy and scope
3. resolves credential inside trusted server-side plane
4. invokes provider
5. strips credentials/sensitive transport data
6. emits auditable result metadata
7. returns only task result

### `capability_health`
Checks executor/provider reachability without exposing credentials.

## Policy

- Raw secrets never enter model context for normal operation.
- `get_api_key` is deprecated for AIﾉアカリ☆ production agents.
- No new ENV/provider-key dependency is introduced into agents.
- Prefer existing subscriptions, balances, free tiers and already-authorized providers.
- New spend requires an explicit external gate.
- Capability grants are least-privilege, bounded and revocable.
- Human gates are limited to identity, OAuth/2FA/CAPTCHA, legal consent, payment confirmation, or physical/creative acts only the human can perform.
- Every external action must be attributable to an agent/capability/action without logging the secret.

## Internal adoption order

1. Mobile Body / cockpit: conversation + dispatch capability.
2. Low-value micro-job agent: discovery -> bounded production -> delivery -> collection capability set; hard time/EV ceiling.
3. Revenue agent: market discovery and proposal/fulfillment capabilities.
4. Creative agent: music/video/web transformation capabilities.
5. Codex/automation executors: deployment and repository capabilities.

No external product claim until at least two internal agents complete real workflows through this gateway.

## 2026 protocol direction

Upgrade the MCP surface from the current v1/stdio-only implementation toward the current MCP TypeScript v2 line and 2026-07-28 semantics. HTTP/remote exposure must use current authorization and credential-isolation requirements; do not expose a remote raw-secret reader.

Vault remains replaceable infrastructure below the gateway. The product boundary is the **agent capability layer**, not a competing generic secret store.

## Success metrics

- provider secrets observed by model: 0
- agent-specific provider ENV keys added: 0
- real workflows completed through capability execution: >= 2 before external promotion
- human credential-copy operations: 0
- capability actions auditable without secret leakage: 100%
- provider/model replacement without changing calling agent: demonstrated

## Migration rule

Do not rewrite the whole system first. Add capability execution beside the existing read plane, migrate one real workflow, verify it, then migrate the next. Remove raw-secret agent paths only after replacement is live.
