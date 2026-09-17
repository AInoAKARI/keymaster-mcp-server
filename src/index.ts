#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KeymasterClient } from "./keymaster.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "akari-capability-gateway",
  version: "0.2.0",
});

const client = KeymasterClient.fromEnv();
registerTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
