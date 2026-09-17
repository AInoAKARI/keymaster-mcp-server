import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { KeymasterClient } from "./keymaster.js";

export function registerTools(server: McpServer, client: KeymasterClient): void {
  server.tool(
    "discover_capabilities",
    "Discover actions this agent may use. Returns capability metadata only; never secrets.",
    {},
    async () => {
      try {
        const capabilities = await client.discoverCapabilities();
        return { content: [{ type: "text" as const, text: JSON.stringify({ capabilities }) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: (err as Error).message }] };
      }
    }
  );

  server.tool(
    "execute_capability",
    "Execute an allowed action inside Keymaster. Credentials remain inside the gateway and are never returned to the agent.",
    {
      capability: z.string().min(1),
      action: z.string().min(1),
      input: z.record(z.unknown()).default({}),
    },
    async ({ capability, action, input }) => {
      const result = await client.executeCapability(capability, action, input);
      return {
        isError: !result.ok,
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  server.tool(
    "capability_health",
    "Check the capability gateway or one named capability without reading its credential.",
    { capability: z.string().optional() },
    async ({ capability }) => {
      const result = await client.capabilityHealth(capability);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
