/**
 * Utility for parsing and round-robin rotating API keys stored as comma-separated values.
 * e.g. "gsk_key1, gsk_key2, gsk_key3"
 */

export function parseApiKeys(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * Returns the next round-robin key for a given provider and persists the last-used index
 * in browser localStorage under 'warden_last_key_indices'.
 */
export function getRotatedApiKey(provider: string, rawKeys?: string | null): string {
  const keys = parseApiKeys(rawKeys);
  if (keys.length === 0) return '';
  if (keys.length === 1) return keys[0];

  if (typeof window === 'undefined') {
    return keys[0];
  }

  try {
    const storageKey = 'warden_last_key_indices';
    const saved = localStorage.getItem(storageKey);
    const indices: Record<string, number> = saved ? JSON.parse(saved) : {};
    
    const lastIndex = typeof indices[provider] === 'number' ? indices[provider] : -1;
    const nextIndex = (lastIndex + 1) % keys.length;
    
    indices[provider] = nextIndex;
    localStorage.setItem(storageKey, JSON.stringify(indices));
    
    return keys[nextIndex];
  } catch (e) {
    console.warn('Failed to rotate API key in localStorage', e);
    return keys[0];
  }
}

/**
 * Returns which key index was last used for UI display / status.
 */
export function getLastUsedKeyInfo(provider: string, rawKeys?: string | null): { total: number; currentIndex: number; activeKeyPreview: string } {
  const keys = parseApiKeys(rawKeys);
  if (keys.length === 0) {
    return { total: 0, currentIndex: -1, activeKeyPreview: '' };
  }

  if (typeof window === 'undefined') {
    return { total: keys.length, currentIndex: 0, activeKeyPreview: maskKey(keys[0]) };
  }

  try {
    const saved = localStorage.getItem('warden_last_key_indices');
    const indices: Record<string, number> = saved ? JSON.parse(saved) : {};
    const currentIndex = typeof indices[provider] === 'number' ? indices[provider] % keys.length : 0;
    return {
      total: keys.length,
      currentIndex,
      activeKeyPreview: maskKey(keys[currentIndex] || keys[0]),
    };
  } catch {
    return { total: keys.length, currentIndex: 0, activeKeyPreview: maskKey(keys[0]) };
  }
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
