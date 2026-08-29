import { Redis } from '@upstash/redis';

let redis;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else {
    console.warn('Upstash Redis credentials are not defined in environment variables.');
  }
} catch (error) {
  console.error('Failed to initialize Upstash Redis client:', error);
}

export default redis;
export { redis };
