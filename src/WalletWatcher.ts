import { cts } from './utils/constants.js';
import { Watcher } from './Watcher.js';
import { Wallet } from './Wallet.js';

interface ICoins {
	BNB: number;
	WBNB: number;
}
type Coin = keyof ICoins;

class WalletWatcher extends Watcher {
	public balance: ICoins;
	private wallet: Wallet;
	constructor(wallet: Wallet, fetchIntervalMs: number = cts.FETCH_BALANCE_INTERVAL) {
		super(fetchIntervalMs);
		this.balance = {
			BNB: 0,
			WBNB: 0,
		};
		this.wallet = wallet;
	}

	protected async fetchData(): Promise<void> {
		try {
			for (const coin of ['BNB', 'WBNB']) {
				this.balance[coin as Coin] = await this.wallet.getBalance(coin as Coin);
			}
		} catch (e: any) {
			throw new Error(`Failed to fetch wallet balance: ${e.message}`);
		}
	}
}

export { WalletWatcher };
