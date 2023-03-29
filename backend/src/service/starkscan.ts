import axios, { AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import { Provider } from 'starknet'
import { StarknetChainId } from 'starknet/dist/constants'

export class StarkscanService {
  private provider: Provider
  private axiosClient: AxiosInstance

  constructor(provider: Provider) {
    this.provider = provider

    if (this.provider.chainId === StarknetChainId.MAINNET) {
      this.axiosClient = axios.create({ baseURL: 'https://api.starkscan.co' })
    } else {
      this.axiosClient = axios.create({
        baseURL: 'https://api-testnet.starkscan.co',
      })
    }
    axiosRetry(this.axiosClient, { retries: 3 })
  }

  getAxiosClient() {
    return this.axiosClient
  }
}
