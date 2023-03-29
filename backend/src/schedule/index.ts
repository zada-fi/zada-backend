import { getProviderFromEnv, isDevelopEnv } from '../util'
import {
  jobCoinbaseCache,
  jobFaucetTwitter,
  jobPairEventStartWork,
  jobPairTransactionPurify,
  jobPairTransactionAccountAddress,
  jobPoolCollect,
} from './jobs'

export const startMasterJobs = async () => {
  // Only develop env
  console.log("startMasterJobs");
  jobFaucetTwitter()

}

export const startWorkerJobs = async () => {}
