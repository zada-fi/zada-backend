import axios, { AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import { Provider } from 'starknet'
import { StarknetChainId } from 'starknet/dist/constants'

export class ViewblockService {
  private provider: Provider
  private axiosClient: AxiosInstance

  constructor(provider: Provider) {
    this.provider = provider

    this.axiosClient = axios.create({
      baseURL: 'https://api.viewblock.io',
      headers: {
        referer: 'https://viewblock.io/',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        origin: 'https://viewblock.io',
      },
    })

    this.axiosClient.interceptors.request.use(
      function (config) {
        config.params = { ...config.params, network: 'mainnet' }
        if (provider.chainId === StarknetChainId.TESTNET) {
          config.params.network = 'goerli'
        }

        return config
      },
      function (error) {
        return Promise.reject(error)
      }
    )

    axiosRetry(this.axiosClient, { retries: 3 })
  }

  getAxiosClient() {
    return this.axiosClient
  }
}
