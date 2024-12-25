// lib/redis.js
import Redis from 'ioredis';

const redis = new Redis({
port:6379,
host:"127.0.0.1",
})



redis.on('error', (err) => console.error('Redis Client Error', err));

await redis.set('key','value');

export default redis;
