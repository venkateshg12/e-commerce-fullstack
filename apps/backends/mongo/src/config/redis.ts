import { RedisOptions } from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "../constants/env";


export const getRedisConfig = (): RedisOptions => ({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});



/* 
"maxRetriesPerRequest tells ioredis how many times to retry an individual Redis command before giving up. 
If it's set to 5, ioredis retries that command up to 5 times and then throws an error if Redis is still unavailable. 
If it's set to null, ioredis doesn't give up after a fixed number of retries. It keeps the connection alive (reconnecting as needed), 
which allows BullMQ's long-running workers to continue once Redis becomes available again."
 */


/* 
"enableReadyCheck controls whether ioredis performs an additional readiness check after connecting to Redis. 
When it's true, ioredis waits until Redis reports that it's fully ready before sending commands. 
When it's false, it skips that extra check and starts using the connection immediately. 
BullMQ commonly uses false because its long-running workers and reconnection logic don't require the extra readiness handshake."
 */