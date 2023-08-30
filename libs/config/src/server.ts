import { env } from './utils'

export const serverConfig = {
  port: Number.parseInt(env('NX_PORT')),
  host: env('NX_HOST'),
  debugStackTrace: true,
  logLevel: process.env['NX_LOG_LEVEL'] || 'debug',
}
