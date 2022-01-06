import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { WBNB_ABI, WBNB_CONTRACT_ADDRESS } from './utils/contracts.js';
import { cts } from './utils/constants.js';

interface ICoins {
	BNB: number;
	WBNB: number;
}
type Coin = keyof ICoins;

class Wallet {
	readonly address: string;
	readonly privateKey: string;
	readonly wbnbContract: Contract;
	private web3: Web3;

	constructor(web3: Web3) {
		if (!web3) {
			throw new Error('Web3 not set');
		}
		if (!process.env.WALLET_PRIVATE_KEY) {
			throw new Error('WALLET_PRIVATE_KEY not set');
		}
		this.web3 = web3;
		const account = this.web3.eth.accounts.privateKeyToAccount(process.env.WALLET_PRIVATE_KEY);
		this.web3.eth.accounts.wallet.add(account);
		this.address = account.address;
		this.privateKey = account.privateKey;
		this.wbnbContract = new web3.eth.Contract(WBNB_ABI, WBNB_CONTRACT_ADDRESS);
	}

	public async getBalance(coin: Coin): Promise<number> {
		try {
			if (coin === 'BNB') {
				return parseFloat(this.web3.utils.fromWei(await this.web3.eth.getBalance(this.address)));
			}
			if (coin === 'WBNB') {
				return parseFloat(
					this.web3.utils.fromWei(await this.wbnbContract.methods.balanceOf(this.address).call())
				);
			}
			throw new Error(`Unknown coin: ${coin}`);
		} catch (e: any) {
			throw new Error(`Failed to get ${coin} balance: ${e.message}`);
		}
	}

	public async unwrapBNB(amount: number): Promise<void> {
		try {
			const amountWei = this.web3.utils.toWei(amount.toString());

			// The estimated gas cost is not accurate, so we use a higher gas limit
			// const gas = await this.wbnbContract.methods.withdraw(amountWei).estimateGas({ from: this.address });

			const tx = await this.wbnbContract.methods.withdraw(amountWei).send({
				from: this.address,
				gas: cts.UNWRAP_BNB_GAS,
				gasPrice: cts.UNWRAP_BNB_GAS_PRICE * 1e9,
			});
			console.log(`Successfully unwrapped ${amount} BNB. Transaction hash: ${tx.transactionHash}`);
		} catch (e: any) {
			throw new Error(`Failed to unwrap BNB: ${e.message}`);
		}
	}

	public async wrapBNB(amount: number): Promise<void> {
		try {
			// The estimated gas cost is not accurate, so we use a higher gas limit
			// const gas = await this.wbnbContract.methods.deposit().estimateGas({ from: this.address });

			const tx = await this.wbnbContract.methods.deposit().send({
				value: this.web3.utils.toWei(amount.toString()),
				from: this.address,
				gas: cts.WRAP_BNB_GAS,
				gasPrice: cts.WRAP_BNB_GAS_PRICE * 1e9,
			});
			console.log(`Successfully wrapped ${amount} BNB. Transaction hash: ${tx.transactionHash}`);
		} catch (e: any) {
			throw new Error(`Error wrapping BNB: ${e.message}`);
		}
	}
}

export { Wallet };
