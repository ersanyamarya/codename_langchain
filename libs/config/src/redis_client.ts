import { logger } from '@ersanyamarya/common-node-utils'
import { env } from './utils'
import { RedisClientType, createClient } from 'redis'

const client: RedisClientType = createClient({
  password: env('NX_REDIS_PASSWORD'),
  socket: {
    host: env('NX_REDIS_HOST'),
    port: Number.parseInt(env('NX_REDIS_PORT')),
  },
})

client.on('error', function (error) {
  logger.error(error)
})

client.on('connect', function () {
  logger.info('Redis client connected')
})

export const redisClient = client
