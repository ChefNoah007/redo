import { createClient } from 'redis';

// Fallback in-memory cache when Redis is not available
const inMemoryCache: Record<string, { data: string; expiry: number }> = {};

let redisClient: ReturnType<typeof createClient> | null = null;
let useRedis = true; // Flag to determine if we should use Redis or fallback to in-memory

export async function getRedisClient() {
  if (!useRedis) {
    return null; // Skip Redis if we've determined it's not available
  }
  
  if (!redisClient) {
    try {
      // Create a new Redis client
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      // Handle errors
      redisClient.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
        if (err.message.includes('ECONNREFUSED')) {
          console.log('Redis server not available, falling back to in-memory cache');
          useRedis = false; // Disable Redis for future calls
          redisClient = null; // Clear the client
        }
      });

      // Connect to Redis
      await redisClient.connect();
      console.log('Successfully connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis, falling back to in-memory cache:', error);
      useRedis = false; // Disable Redis for future calls
      redisClient = null; // Clear the client
    }
  }

  return redisClient;
}

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
  try {
    // Try Redis first
    const client = await getRedisClient();
    if (client) {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    }
    
    // Fallback to in-memory cache
    return getFromMemoryCache<T>(key);
  } catch (error) {
    console.error('Error getting cached data:', error);
    // Try in-memory cache as last resort
    return getFromMemoryCache<T>(key);
  }
}

export async function setCachedData<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
  try {
    // Try Redis first
    const client = await getRedisClient();
    if (client) {
      await client.set(key, JSON.stringify(data), { EX: ttl });
      return;
    }
    
    // Fallback to in-memory cache
    setToMemoryCache(key, data, ttl);
  } catch (error) {
    console.error('Error setting cached data:', error);
    // Try in-memory cache as last resort
    setToMemoryCache(key, data, ttl);
  }
}
