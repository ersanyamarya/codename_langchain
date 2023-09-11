import { ConnectOptions } from 'mongoose'
import { env } from './utils'

const uri = env('NX_MONGO_URI')
const options: ConnectOptions = {}

export const mongoDbConfig = { uri, options }
