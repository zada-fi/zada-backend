import cluster from 'cluster'
import Koa from 'koa'
import koaBodyparser from 'koa-bodyparser'
import cors from 'koa2-cors'
import 'reflect-metadata'
import semver from 'semver'
import { createConnection } from 'typeorm'
import { appConfig, ormConfig } from './config'
import controller from './controller'
import middlewareGlobal from './middleware/global'
import { startMasterJobs, startWorkerJobs } from './schedule'
import { sleep } from './util'
import { Core } from './util/core'
import { accessLogger, errorLogger } from './util/logger'

const main = async () => {
  try {
    // initialize mysql connect, waiting for mysql server started
    // accessLogger.info(`process: ${process.pid}. Connecting to the database...`)
    const reconnectTotal = 18
    for (let index = 1; index <= reconnectTotal; index++) {
      try {
        // db bind
        Core.db = await createConnection(ormConfig.options)
        accessLogger.info(
          `process: ${process.pid}. Connect to the database succeed!`
        )

        // Break if connected
        break
      } catch (err) {
        accessLogger.warn(
          `process: ${process.pid}. Connect to database failed: ${index}. Error: ${err.message}`
        )

        if (index == reconnectTotal) {
          throw err
        }

        // sleep 1.5s
        await sleep(1500)
      }
    }

      // Start WorkerJobs in child process
      startMasterJobs()
  } catch (error) {
    accessLogger.info(error)
  }
}
main()
