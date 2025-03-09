// In-memory cache implementation
const inMemoryCache: Record<string, { data: string; expiry: number }> = {};

// Helper function for in-memory cache
function getFromMemoryCache<T>(key: string): T | null {
  const item = inMemoryCache[key];
  if (!item) return null;
  
  const now = Date.now();
  if (item.expiry < now) {
    // Item has expired
    delete inMemoryCache[key];
    return null;
  }
  
  return JSON.parse(item.data) as T;
}

// Helper function for in-memory cache
function setToMemoryCache<T>(key: string, data: T, ttl: number): void {
  const expiry = Date.now() + ttl * 1000; // Convert seconds to milliseconds
  inMemoryCache[key] = {
    data: JSON.stringify(data),
    expiry
  };
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  return getFromMemoryCache<T>(key);
}

export async function setCachedData<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
  setToMemoryCache(key, data, ttl);
}
