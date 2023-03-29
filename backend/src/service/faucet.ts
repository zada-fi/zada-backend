import { utils,Contract,Wallet,providers } from 'ethers'
import { In } from 'typeorm'
import { faucetConfig } from '../config'
import erc20 from '../config/abis/erc20.json'
import { TwitterCrawl } from '../model/twitter_crawl'
import { isAddress, sleep } from '../util'
import { Core } from '../util/core'
import { accessLogger, errorLogger } from '../util/logger'
type Account =  {
    privateKey:string;
    address:string;
}
export class FaucetService {
  private static accountWorking: { [key: string]: boolean } = {}

  constructor() {}

  async fromTwitter() {
    const accounts = this.getAccounts()
    if (accounts.length < 1) {
      errorLogger.error('FromTwitter failed: Miss accounts')
      return
    }

    const accountTweetQuantity = 20
    const noWorkingAccounts = accounts.filter(
      (item) => FaucetService.accountWorking[item.address] !== true
    )
    if (noWorkingAccounts.length < 1) {
      return
    }

    const tweets = await Core.db.getRepository(TwitterCrawl).find({
      where: { status: 0 },
      take: accountTweetQuantity * noWorkingAccounts.length,
      order: { tweet_time: 'ASC' },
    })

    let start = 0
    for (const account of noWorkingAccounts) {
      const end = start + accountTweetQuantity
      const groupTweets = tweets.slice(start, end)

      this.sendTokens(account, groupTweets)

      // Reduce "Too Many Requests" prompts
      await sleep(10000)

      start = end
    }
  }

  private async sendTokens(account: Account, tweets: TwitterCrawl[]) {
    const repository = Core.db.getRepository(TwitterCrawl)

    const recipients: string[] = []
    const tweet_ids: string[] = []
    for (const tweet of tweets) {
      const recipient = this.getAddress(tweet.content)
      console.log('send tokens to ' + recipient);
      if (recipient) {
        recipients.push(recipient)
        tweet_ids.push(tweet.tweet_id)

        // Update status=3(fauceting)
        await repository.update(
          { tweet_id: tweet.tweet_id },
          { recipient, status: 3 }
        )
      } else {
        await repository.update({ tweet_id: tweet.tweet_id }, { status: 2 })
      }
    }

    // Check recipients
    if (recipients.length === 0) {
      return
    }

    // Set account working
    FaucetService.accountWorking[account.address] = true

    try {
      await this.execute(account, recipients)
      await repository.update({ tweet_id: In(tweet_ids) }, { status: 1 })
    } catch (error) {
      // Retry "Too Many Requests" | "nonce invalid" | "nonce is invalid" errors
      const retry = /(Too Many Requests|nonce invalid|nonce is invalid)/gi.test(
        error.message
      )

      if (retry) {
        // Retry
        await repository.update({ tweet_id: In(tweet_ids) }, { status: 0 })
      } else {
        errorLogger.error(
          `Execute fail: ${error.message}. Account: ${account.address}`
        )
        await repository.update({ tweet_id: In(tweet_ids) }, { status: 2 })
      }
    } finally {
      // Set account no working
      FaucetService.accountWorking[account.address] = false
    }
  }

  private async execute(account: Account, recipients: string[]) {
    //const { aAddress, aAmount, bAddress, bAmount, ethAddress, ethAmount } =
    //  faucetConfig
    const aAddress = "0x457F5Bacd72a096B78CAA6E4cC27c1b5175746c3";
    const url = "https://alpha-rpc.scroll.io/l2";
    const provider = new providers.JsonRpcProvider(url);
    let private_key = "0x27593fea79697e947890ecbecce7901b0008345e5d7259710d0dd5e500d040be";
    const wallet = new Wallet(private_key, provider);

    //decimals of ZDA is 18
    //const b = bnToUint256(toBN(bAmount.toString()))
    //const eth = bnToUint256(toBN(ethAmount.toString()))
    let abi = [
            // transfer
            {
                "constant": false,
                "inputs": [
                    {
                        "name": "_to",
                        "type": "address"
                    },
                    {
                        "name": "_value",
                        "type": "uint256"
                    }
                ],
                "name": "transfer",
                "outputs": [
                    {
                        "name": "",
                        "type": "bool"
                    }
                ],
                "type": "function"
            }
    ];
   
    const amount = utils.parseUnits("10", 18);
    const tokenContract = new Contract(aAddress,abi,wallet);
    
    for (const recipient of recipients) {
	let tx = tokenContract.connect(wallet).transfer(recipient,amount);
	console.log(tx);
    }

    /*accessLogger.info('Faucet transaction_hash:', faucetResp.transaction_hash)
    await account.waitForTransaction(faucetResp.transaction_hash)
    accessLogger.info('Transaction_hash fauceted:', faucetResp.transaction_hash)*/
  }

  private getAccounts() {

    const accounts: Account[] = []

    for (const i in faucetConfig.privateKeys) {
      const privateKey = faucetConfig.privateKeys[i]
      const address = faucetConfig.accounts[i]
      if (!privateKey || !address) {
        continue
      }
      let account = {privateKey,address};
      accounts.push(account)
    }
    return accounts
  }

  private getAddress(content: string): string | undefined {
    const reg = new RegExp(/0x[a-fA-F0-9]{40}/gi)
    const address = content.match(reg)?.[0]

    return isAddress(address) ? address : undefined
  }
}
