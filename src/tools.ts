import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { KeymasterClient } from "./keymaster.js";

export function registerTools(server: McpServer, client: KeymasterClient): void {
  // ── get_api_key ──
  server.tool(
    "get_api_key",
    "Retrieve an API key from the Keymaster vault. Returns the secret value for the given service and key name.",
    {
      api_name: z
        .string()
        .describe("Service name (e.g. 'openai', 'groq', 'stripe')"),
      key_name: z
        .string()
        .default("api_key")
        .describe("Key field name (default: 'api_key')"),
    },
    async ({ api_name, key_name }) => {
      try {
        const value = await client.getApiKey(api_name, key_name);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ api_name, key_name, api_key: value }, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: (err as Error).message },
          ],
        };
      }
    }
  );

  // ── list_api_keys ──
  server.tool(
    "list_api_keys",
    "List registered secret paths in the vault. Returns names only, not values. Requires VAULT_ADDR and VAULT_TOKEN env vars.",
    {
      path: z
        .string()
        .optional()
        .describe("Sub-path to list (e.g. 'api_keys'). Leave empty for root."),
    },
    async ({ path }) => {
      try {
        const keys = await client.listKeys(path);
        const lines = keys.map((k) =>
          k.endsWith("/") ? `[dir]  ${k.replace(/\/$/, "")}` : `[key]  ${k}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: lines.length > 0 ? lines.join("\n") : "No keys found.",
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: (err as Error).message },
          ],
        };
      }
    }
  );

  // ── check_key_health ──
  server.tool(
    "check_key_health",
    "Check whether a specific API key exists and is retrievable from the vault.",
    {
      api_name: z
        .string()
        .describe("Service name (e.g. 'openai', 'groq', 'stripe')"),
      key_name: z
        .string()
        .default("api_key")
        .describe("Key field name (default: 'api_key')"),
    },
    async ({ api_name, key_name }) => {
      const result = await client.checkKeyHealth(api_name, key_name);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ api_name, key_name, ...result }, null, 2),
          },
        ],
      };
    }
  );
}
