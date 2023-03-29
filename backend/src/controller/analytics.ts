import { plainToInstance } from 'class-transformer'
import { Context, DefaultState } from 'koa'
import KoaRouter from 'koa-router'
import { AnalyticsService } from '../service/analytics'

export default function (router: KoaRouter<DefaultState, Context>) {
  const analyticsService = new AnalyticsService()

  router.get('analytics', async ({ restful }) => {
    const tvls = await analyticsService.getTVLsByDay()
    const volumes = await analyticsService.getVolumesByDay()

    restful.json({ tvls, volumes })
  })

  router.get('analytics/pairs', async ({ restful, request }) => {
    const params = plainToInstance(
      class {
        startTime: number
        endTime: number
        page: number
      },
      request.query
    )

    const pairs = await analyticsService.getPairs(
      params.startTime,
      params.endTime,
      params.page
    )

    restful.json(pairs)
  })

  router.get('analytics/transactions', async ({ restful, request }) => {
    const params = plainToInstance(
      class {
        startTime: number
        endTime: number
        keyName: string
        page: number
      },
      request.query
    )

    const transactions = await analyticsService.getTransactions(
      params.startTime,
      params.endTime,
      params.keyName,
      params.page
    )

    const summary = await analyticsService.getTransactionsSummary(
      params.startTime,
      params.endTime
    )

    restful.json({ transactions, summary })
  })

  router.get('analytics/top_tvl_accounts', async ({ restful }) => {
    const tvls = await analyticsService.getTVLsByAccount()

    restful.json({ tvls })
  })
}
