# keymaster-mcp-server

An MCP (Model Context Protocol) server for **Keymaster** — a secure API key management proxy backed by HashiCorp Vault.

Keymaster follows the "services hold tickets, not secrets" architecture: your applications never store raw API keys. Instead, they hold only a Keymaster auth token and fetch secrets at runtime.

## Installation

```bash
npm install -g keymaster-mcp-server
```

Or run directly with npx:

```bash
npx keymaster-mcp-server
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `KEYMASTER_BASE_URL` | **Yes** | Keymaster proxy URL (e.g. `https://your-keymaster.onrender.com`) |
| `KEYMASTER_AUTH_TOKEN` | **Yes** | Bearer token for Keymaster authentication |
| `VAULT_ADDR` | No | HashiCorp Vault URL — required only for `list_api_keys` |
| `VAULT_TOKEN` | No | Vault access token — required only for `list_api_keys` |
| `VAULT_MOUNT` | No | Vault KV v2 mount name (default: `akarihearts-v2`) |

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "keymaster": {
      "command": "npx",
      "args": ["-y", "keymaster-mcp-server"],
      "env": {
        "KEYMASTER_BASE_URL": "https://your-keymaster.onrender.com",
        "KEYMASTER_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

To also enable key listing (requires direct Vault access):

```json
{
  "mcpServers": {
    "keymaster": {
      "command": "npx",
      "args": ["-y", "keymaster-mcp-server"],
      "env": {
        "KEYMASTER_BASE_URL": "https://your-keymaster.onrender.com",
        "KEYMASTER_AUTH_TOKEN": "your-auth-token",
        "VAULT_ADDR": "https://your-vault.onrender.com",
        "VAULT_TOKEN": "your-vault-token"
      }
    }
  }
}
```

## Tools

### `get_api_key`

Retrieve an API key from the vault.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `api_name` | string | *(required)* | Service name (e.g. `openai`, `groq`, `stripe`) |
| `key_name` | string | `api_key` | Key field name |

### `list_api_keys`

List registered secret paths in the vault. Returns names only — never values.

> Requires `VAULT_ADDR` and `VAULT_TOKEN` environment variables.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `path` | string | *(root)* | Sub-path to list (e.g. `api_keys`) |

### `check_key_health`

Check whether a specific API key exists and is retrievable.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `api_name` | string | *(required)* | Service name |
| `key_name` | string | `api_key` | Key field name |

## Architecture

```
Claude / AI Agent
       │
       ▼
  keymaster-mcp  (this server, MCP protocol over stdio)
       │
       ▼
   Keymaster     (read-only proxy, Bearer auth)
       │
       ▼
  HashiCorp Vault (KV v2 secrets engine)
```

## Security

- **Never hardcode** API keys or tokens in your codebase. Always use environment variables.
- `KEYMASTER_AUTH_TOKEN` is a "ticket" — it grants access to the Keymaster proxy but does not contain secrets itself.
- The `get_api_key` tool returns raw secret values. Ensure your MCP client handles them securely and does not log them.
- `list_api_keys` requires direct Vault access (`VAULT_TOKEN`). Only grant this to trusted environments.
- Keymaster follows the **"services hold tickets, not secrets"** pattern: rotate `KEYMASTER_AUTH_TOKEN` without touching individual API keys.

## License

MIT
