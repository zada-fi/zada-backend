import schedule from 'node-schedule'
import { Provider } from 'starknet'
import { CoinbaseService } from '../service/coinbase'
import { FaucetService } from '../service/faucet'
import { PairEventService } from '../service/pair_event'
import { PairTransactionService } from '../service/pair_transaction'
import { PoolService } from '../service/pool'
import { errorLogger } from '../util/logger'

// import { doSms } from '../sms/smsSchinese'
class MJob {
  protected rule:
    | string
    | number
    | schedule.RecurrenceRule
    | schedule.RecurrenceSpecDateRange
    | schedule.RecurrenceSpecObjLit
    | Date
  protected callback?: () => any
  protected jobName?: string

  /**
   * @param rule
   * @param callback
   * @param jobName
   */
  constructor(
    rule:
      | string
      | number
      | schedule.RecurrenceRule
      | schedule.RecurrenceSpecDateRange
      | schedule.RecurrenceSpecObjLit
      | Date,
    callback?: () => any,
    jobName?: string
  ) {
    this.rule = rule
    this.callback = callback
    this.jobName = jobName
  }

  public schedule(): schedule.Job {
    return schedule.scheduleJob(this.rule, async () => {
      try {
        this.callback && (await this.callback())
      } catch (error) {
        let message = `MJob.schedule error: ${error.message}, rule: ${this.rule}`
        if (this.jobName) {
          message += `, jobName: ${this.jobName}`
        }
        errorLogger.error(message)
      }
    })
  }
}

// Pessimism Lock Job
class MJobPessimism extends MJob {
  public schedule(): schedule.Job {
    let pessimismLock = false

    const _callback = this.callback

    this.callback = async () => {
      if (pessimismLock) {
        return
      }
      pessimismLock = true

      try {
        _callback && (await _callback())
      } catch (error) {
        throw error
      } finally {
        // Always release lock
        pessimismLock = false
      }
    }

    return super.schedule()
  }
}

export function jobFaucetTwitter() {
  const callback = async () => {
    await new FaucetService().fromTwitter()
  }

  console.log("jobFaucetTwitter");
  new MJobPessimism(
    '*/1 * * * * *',
    callback,
    jobFaucetTwitter.name
  ).schedule()
}

export function jobCoinbaseCache() {
  const callback = async () => {
    await new CoinbaseService().cache()
  }

  new MJobPessimism('*/5 * * * * *', callback, jobCoinbaseCache.name).schedule()
}

export function jobPairEventStartWork(provider: Provider) {
  const callback = async () => {
    await new PairEventService(provider).startWork()
  }

  new MJobPessimism(
    '*/5 * * * * *',
    callback,
    jobPairEventStartWork.name
  ).schedule()
}

export function jobPairTransactionPurify(provider: Provider) {
  const callback = async () => {
    await new PairTransactionService(provider).purify()
  }

  new MJobPessimism(
    '*/5 * * * * *',
    callback,
    jobPairTransactionPurify.name
  ).schedule()
}

export function jobPairTransactionAccountAddress(provider: Provider) {
  const callback = async () => {
    await new PairTransactionService(provider).purifyAccountAddress()
  }

  new MJobPessimism(
    '*/5 * * * * *',
    callback,
    jobPairTransactionAccountAddress.name
  ).schedule()
}

export function jobPoolCollect(provider: Provider) {
  const callback = async () => {
    await new PoolService(provider).collect()
  }

  new MJobPessimism('*/10 * * * * *', callback, jobPoolCollect.name).schedule()
}
