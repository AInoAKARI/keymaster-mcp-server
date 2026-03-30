/**
 * KeymasterClient — fetches secrets from Keymaster proxy and Vault.
 *
 * Keymaster (read-only proxy):  GET /vault/api-key?api_name=<service>&key_name=<field>
 * Vault (direct, for listing):  LIST /v1/<mount>/metadata
 */

export interface KeymasterClientOptions {
  baseUrl: string;
  authToken: string;
  /** Optional — needed only for listKeys (Vault direct access) */
  vaultAddr?: string;
  vaultToken?: string;
  vaultMount?: string;
}

export class KeymasterClient {
  private baseUrl: string;
  private authToken: string;
  private vaultAddr?: string;
  private vaultToken?: string;
  private vaultMount: string;

  constructor(opts: KeymasterClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.authToken = opts.authToken;
    this.vaultAddr = opts.vaultAddr?.replace(/\/+$/, "");
    this.vaultToken = opts.vaultToken;
    this.vaultMount = opts.vaultMount || "akarihearts-v2";
  }

  static fromEnv(): KeymasterClient {
    const baseUrl = process.env.KEYMASTER_BASE_URL;
    const authToken = process.env.KEYMASTER_AUTH_TOKEN;

    if (!baseUrl || !authToken) {
      throw new Error(
        "Missing required environment variables: KEYMASTER_BASE_URL and KEYMASTER_AUTH_TOKEN"
      );
    }

    return new KeymasterClient({
      baseUrl,
      authToken,
      vaultAddr: process.env.VAULT_ADDR,
      vaultToken: process.env.VAULT_TOKEN,
      vaultMount: process.env.VAULT_MOUNT,
    });
  }

  /** Retrieve an API key value from the Keymaster vault. */
  async getApiKey(apiName: string, keyName: string): Promise<string> {
    const url = `${this.baseUrl}/vault/api-key?api_name=${encodeURIComponent(apiName)}&key_name=${encodeURIComponent(keyName)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.authToken}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Keymaster returned HTTP ${res.status} for ${apiName}/${keyName}: ${body}`
      );
    }

    const data = (await res.json()) as { api_key?: string };
    if (!data.api_key) {
      throw new Error(`Empty value returned for ${apiName}/${keyName}`);
    }

    return data.api_key;
  }

  /** List registered secret paths in the vault. Returns names only, never values. */
  async listKeys(path?: string): Promise<string[]> {
    if (!this.vaultAddr || !this.vaultToken) {
      throw new Error(
        "listKeys requires VAULT_ADDR and VAULT_TOKEN environment variables (direct Vault access)"
      );
    }

    const metadataPath = path ? `/${path}` : "";
    const url = `${this.vaultAddr}/v1/${this.vaultMount}/metadata${metadataPath}?list=true`;

    const res = await fetch(url, {
      headers: { "X-Vault-Token": this.vaultToken },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Vault returned HTTP ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { data?: { keys?: string[] } };
    return data?.data?.keys ?? [];
  }

  /** Check whether the Keymaster service is reachable and responding. */
  async checkHealth(): Promise<boolean> {
    try {
      // Probe with a known-safe request; any 2xx or 404 means Keymaster is up
      const url = `${this.baseUrl}/vault/api-key?api_name=__health__&key_name=__ping__`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });
      // 200 or 404 both mean the service is alive
      return res.status === 200 || res.status === 404;
    } catch {
      return false;
    }
  }

  /** Check whether a specific key exists and is retrievable. */
  async checkKeyHealth(
    apiName: string,
    keyName: string
  ): Promise<{ healthy: boolean; status: number; message: string }> {
    try {
      const url = `${this.baseUrl}/vault/api-key?api_name=${encodeURIComponent(apiName)}&key_name=${encodeURIComponent(keyName)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });

      if (!res.ok) {
        return { healthy: false, status: res.status, message: `HTTP ${res.status}` };
      }

      const data = (await res.json()) as { api_key?: string };
      const hasValue = Boolean(data.api_key);
      return {
        healthy: hasValue,
        status: res.status,
        message: hasValue ? "Key exists and is non-empty" : "Key is empty",
      };
    } catch (err) {
      return {
        healthy: false,
        status: 0,
        message: `Connection error: ${(err as Error).message}`,
      };
    }
  }
}
