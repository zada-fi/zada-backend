import { AxiosInstance } from 'axios'
import { Provider } from 'starknet'
import { Repository } from 'typeorm'
import { PairEvent } from '../model/pair_event'
import { Core } from '../util/core'
import { Pair, PoolService } from './pool'
import { StarkscanService } from './starkscan'

export class PairEventService {
  private static pairCursors: { [key: string]: string } = {}

  private provider: Provider
  private axiosClient: AxiosInstance
  private repoPairEvent: Repository<PairEvent>

  constructor(provider: Provider) {
    this.provider = provider
    this.axiosClient = new StarkscanService(provider).getAxiosClient()
    this.repoPairEvent = Core.db.getRepository(PairEvent)
  }

  async startWork() {
    if (PoolService.pairs.length < 1) {
      return
    }

    await Promise.all(PoolService.pairs.map((pair) => this.collect(pair)))
  }

  async collect(pair: Pair) {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
    const headers = { 'user-agent': userAgent }

    const afterCursor = await this.getAfterCursor(pair)

    const postData = {
      operationName: 'events',
      variables: {
        input: {
          from_address: pair.pairAddress,
          sort_by: 'timestamp',
          order_by: 'asc',
        },
        first: 100,
        after: afterCursor,
      },
      query:
        'query events($first: Float, $last: Float, $before: String, $after: String, $input: EventsInput!) {\n  events(\n    first: $first\n    last: $last\n    before: $before\n    after: $after\n    input: $input\n  ) {\n    edges {\n      cursor\n      node {\n        id\n        block_hash\n        transaction_hash\n        event_index\n        from_address\n        keys\n        data\n        timestamp\n        key_name\n        __typename\n      }\n      __typename\n    }\n    pageInfo {\n      hasNextPage\n      __typename\n    }\n    __typename\n  }\n}',
    }

    const resp = await this.axiosClient.post('/graphql', postData, { headers })
    const edges = resp.data?.data?.events?.edges
    if (!edges || edges.length < 1) {
      return
    }

    const saveWhenNoExist = async (edge: any) => {
      const { cursor, node } = edge

      if (cursor) {
        PairEventService.pairCursors[pair.pairAddress] = cursor
      }

      if (!node.id) {
        return
      }

      const one = await this.repoPairEvent.findOne({
        where: { event_id: node.id },
      })
      if (one) {
        return
      }

      const pairEvent = new PairEvent()
      pairEvent.event_id = node.id
      pairEvent.pair_address = pair.pairAddress
      pairEvent.transaction_hash = node.transaction_hash
      pairEvent.event_data = JSON.stringify(node.data)
      pairEvent.key_name = node.key_name
      pairEvent.event_time = new Date(node.timestamp * 1000)
      pairEvent.cursor = cursor
      pairEvent.source_data = JSON.stringify(edge)
      return this.repoPairEvent.save(pairEvent)
    }

    await Promise.all(edges.map((edge: any) => saveWhenNoExist(edge)))
  }

  private async getAfterCursor(pair: Pair) {
    if (PairEventService.pairCursors[pair.pairAddress]) {
      return PairEventService.pairCursors[pair.pairAddress]
    }

    const pairEvent = await this.repoPairEvent.findOne({
      select: ['cursor'],
      where: { pair_address: pair.pairAddress },
      order: { event_time: 'DESC' },
    })
    return pairEvent?.cursor || ''
  }
}
