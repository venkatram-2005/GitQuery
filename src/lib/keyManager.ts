import "dotenv/config";

interface KeyState {
  key: string;
  cooldownUntil: number; // ms timestamp until usable
  lastUsed: number;      // ms timestamp for throttle (1 sec gap)
}

class KeyManager {
  private keys: KeyState[] = [];
  private goldenKey: string | null = null;
  private currentIndex: number = 0;
  private cooldownMs: number = 60_000; // 1 min cooldown on 429
  private throttleMs: number = 1000;   // 1 sec between requests per key

  constructor() {
    // Load normal keys
    for (let i = 1; i <= 23; i++) {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      if (k) {
        this.keys.push({ key: k, cooldownUntil: 0, lastUsed: 0 });
      }
    }

    // Load golden fallback key
    if (process.env.GEMINI_GOLDEN_KEY) {
      this.goldenKey = process.env.GEMINI_GOLDEN_KEY;
    }

    if (this.keys.length === 0 && !this.goldenKey) {
      console.warn("⚠️ No Gemini API keys loaded!");
    } else {
      console.log(`🔑 Loaded ${this.keys.length} Gemini keys${this.goldenKey ? " + golden key" : ""}`);
    }
  }

  private async delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  async getKey(): Promise<string> {
    const now = Date.now();

    // Try all keys once
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const k = this.keys[idx];

      if (now > k!.cooldownUntil && now - k!.lastUsed >= this.throttleMs) {
        // Update pointer + mark usage
        this.currentIndex = (idx + 1) % this.keys.length;
        k!.lastUsed = Date.now();
        return k!.key;
      }
    }

    // If all failed, try golden key as backup
    if (this.goldenKey) {
      console.warn("⚠️ Using golden fallback key");
      return this.goldenKey;
    }

    console.error("❌ All Gemini keys are on cooldown or throttled!");
    return "";
  }

  markKeyAsFailed(failedKey: string, errorCode?: number) {
    const k = this.keys.find(k => k.key === failedKey);
    if (k && errorCode === 429) {
      k.cooldownUntil = Date.now() + this.cooldownMs;
      console.warn(`⏳ Key put on cooldown for ${this.cooldownMs / 1000}s (rate limit)`);
    }
  }
}

export const keyManager = new KeyManager();
