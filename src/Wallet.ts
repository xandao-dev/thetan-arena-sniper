import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { WBNB_ABI, WBNB_CONTRACT_ADDRESS } from './utils/contracts.js';

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

	public async getBNBBalance(): Promise<number> {
		const balance = parseFloat(this.web3.utils.fromWei(await this.web3.eth.getBalance(this.address)));
		return balance;
	}

	public async getWBNBBalance(): Promise<number> {
		const balance = parseFloat(
			this.web3.utils.fromWei(await this.wbnbContract.methods.balanceOf(this.address).call())
		);
		return balance;
	}

	// FIXME: test this
	public async unwrapBNB(amount: number): Promise<void> {
		try {
			const amountWei = this.web3.utils.toWei(amount.toString());
			/*const tx = await this.wbnbContract.methods.withdraw(amountWei).send({
				from: this.address,
				gas: GAS_LIMIT,
				gasPrice: GAS_UNIT_PRICE_GWEI,
			});*/
			// console.log(`Successfully unwrapped ${amount} BNB. Transaction hash: ${tx.transactionHash}`);
		} catch (e: any) {
			console.error(`Failed to unwrap BNB: ${e.message}`);
		}
	}

	// FIXME: test this
	public async wrapBNB(amount: number): Promise<void> {
		try {
			const amountBNB = this.web3.utils.toDecimal(amount.toString());
			// estimate gas
			const gas = await this.wbnbContract.methods.deposit(amountBNB).estimateGas({
				from: this.address,
			});
			console.log(`Estimated gas for deposit: ${gas}`);
			/*const tx = await this.wbnbContract.methods.wrapBNB(amountBNB).send({
				from: this.address,
				gas: GAS_LIMIT,
				gasPrice: GAS_UNIT_PRICE_GWEI,
			});*/
			// console.log(`Successfully wrapped ${amount} BNB. Transaction hash: ${tx.transactionHash}`);
		} catch (e: any) {
			console.log(`Error wrapping BNB: ${e.message}`);
		}
	}
}

export { Wallet };
