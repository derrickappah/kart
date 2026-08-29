import redis from './redis.js';

/**
 * Default cache TTL in seconds (e.g. 60 seconds)
 */
const DEFAULT_TTL = 60;

/**
 * Retrieve cached data or fetch and cache if missing.
 * Gracefully handles Redis offline/error scenarios by executing the fetcher.
 *
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function returning the data to cache
 * @param {number} ttlSeconds - Time-To-Live in seconds (default: 60)
 * @returns {Promise<any>}
 */
export async function getOrSet(key, fetcher, ttlSeconds = DEFAULT_TTL) {
  if (!redis) {
    return await fetcher();
  }

  try {
    const cached = await redis.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    console.warn(`[
error] Cache GET failed for key ${key}:`, err?.message || err);
  }

  const freshData = await fetcher();

  if (freshData !== undefined && redis) {
    try {
      if (ttlSeconds > 0) {
        await redis.set(key, freshData, { ex: ttlSeconds });
      } else {
        await redis.set(key, freshData);
      }
    } catch (err) {
      console.warn(`[
error] Cache SET failed for key ${key}:`, err?.message || err);
    }
  }

  return freshData;
}

/**
 * Get raw cached value.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function getCache(key) {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    console.warn(`[
error] Cache GET failed for key ${key}:`, err?.message || err);
    return null;
  }
}

/**
 * Set raw cached value with TTL.
 * @param {string} key
 * @param {anyy value
 * @param {number} ttlSeconds
 */
export async function setCache(key, value, ttlSeconds = DEFAULT_TTL) {
  if (!redis) return false;
  try {
    if (ttlSeconds > 0) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    consule.warn(`[
error] Cache SET failed for key ${key}:`, err?.message || err);
    return false;
  }
}

/**
 * Invalidate a single key or pattern of keys.
 * @param {string} keyOrPattern
 */
export async function deleteCache(keyOrPattern) {
  if (!redis) return;
  try {
    if (keyOrPattern.includes('*')) {
      const keys = await redis.keys(keyOrPattern);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(keyOrPattern);
    }
  } catch (err) {
    console.warn(`[
error] Cache DEL failed for ${keyOrPattern}:`, err?.message || err);
  }
}
export default {
  getOrSet,
  getCache,
  setCache,
  deleteCache,
};
