/**
 * KeymasterClient — capability gateway client.
 *
 * Agent-facing code must prefer capability methods. Raw secret retrieval remains
 * temporarily for backwards compatibility and must not be exposed as an MCP tool.
 */
export interface KeymasterClientOptions {
  baseUrl: string;
  authToken: string;
}

export type Capability = {
  id: string;
  service: string;
  actions: string[];
  description?: string;
};

export type CapabilityResult = {
  ok: boolean;
  status: number;
  result?: unknown;
  error?: string;
};

export class KeymasterClient {
  private baseUrl: string;
  private authToken: string;

  constructor(opts: KeymasterClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.authToken = opts.authToken;
  }

  static fromEnv(): KeymasterClient {
    const baseUrl = process.env.KEYMASTER_BASE_URL;
    const authToken = process.env.KEYMASTER_AUTH_TOKEN;
    if (!baseUrl || !authToken) {
      throw new Error("Missing KEYMASTER_BASE_URL or KEYMASTER_AUTH_TOKEN");
    }
    return new KeymasterClient({ baseUrl, authToken });
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.authToken}`);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    return fetch(`${this.baseUrl}${path}`, { ...init, headers });
  }

  async discoverCapabilities(): Promise<Capability[]> {
    const res = await this.request("/capabilities");
    if (!res.ok) throw new Error(`Capability discovery failed: HTTP ${res.status}`);
    const data = await res.json() as { capabilities?: Capability[] } | Capability[];
    return Array.isArray(data) ? data : data.capabilities ?? [];
  }

  async executeCapability(capability: string, action: string, input: unknown): Promise<CapabilityResult> {
    const res = await this.request("/capabilities/execute", {
      method: "POST",
      body: JSON.stringify({ capability, action, input }),
    });
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, status: res.status, error: String(body.error ?? `HTTP ${res.status}`) };
    }
    return { ok: true, status: res.status, result: body.result ?? body };
  }

  async capabilityHealth(capability?: string): Promise<{ healthy: boolean; status: number }> {
    const suffix = capability ? `?capability=${encodeURIComponent(capability)}` : "";
    try {
      const res = await this.request(`/capabilities/health${suffix}`);
      return { healthy: res.ok, status: res.status };
    } catch {
      return { healthy: false, status: 0 };
    }
  }

  /** @deprecated Internal compatibility only. Never expose this through MCP. */
  async getApiKey(apiName: string, keyName: string): Promise<string> {
    const res = await this.request(`/vault/api-key?api_name=${encodeURIComponent(apiName)}&key_name=${encodeURIComponent(keyName)}`);
    if (!res.ok) throw new Error(`Keymaster returned HTTP ${res.status}`);
    const data = await res.json() as { api_key?: string };
    if (!data.api_key) throw new Error(`Empty value returned for ${apiName}/${keyName}`);
    return data.api_key;
  }
}
