import path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') })

import { ListenOptions } from 'net'
import * as logConfig from './log'
import * as ormConfig from './orm'
import networkConfig from './network'
import * as contractConfig from './contract'
import faucetConfig from './faucet'

const appConfig = {
  options: <ListenOptions>{
    port: process.env.APP_OPTIONS_PORT || 3000,
    host: process.env.APP_OPTIONS_HOST || '127.0.0.1',
  },
}

export {
  appConfig,
  ormConfig,
  logConfig,
  networkConfig,
  contractConfig,
  faucetConfig,
}
