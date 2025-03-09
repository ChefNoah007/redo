import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!redisClient) {
    // Create a new Redis client
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    // Handle errors
    redisClient.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    // Connect to Redis
    await redisClient.connect();
  }

  return redisClient;
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(key, JSON.stringify(data), { EX: ttl });
  } catch (error) {
    console.error('Error setting cached data:', error);
  }
}
