import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import axios from 'axios';
import { setIntervalAsync } from 'set-interval-async/dynamic/index.js';
import { clearIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async';
import { Wallet } from './Wallet.js';
import { urls } from './utils/urls.js';
import { cts } from './utils/constants.js';
import {
	MARKETPLACE_ABI,
	MARKETPLACE_CONTRACT_ADDRESS,
	THETAN_HERO_CONTRACT_ADDRESS,
	WBNB_CONTRACT_ADDRESS,
} from './utils/contracts.js';

const GAS_LIMIT: number = 300000; // Got this from thetan marketplace transaction
const GAS_UNIT_PRICE_GWEI: number = 20; // 1 gwei = 10^-9 BNB

class Marketplace {
	private wallet: Wallet;
	private web3: Web3;
	private bearer?: string;
	private connectIntervalTimer?: SetIntervalAsyncTimer;
	private thetanContract: Contract;

	constructor(web3: Web3, wallet: Wallet) {
		if (!web3) {
			throw new Error('Web3 is not set');
		}
		if (!wallet) {
			throw new Error('Wallet not set');
		}
		this.web3 = web3;
		this.wallet = wallet;
		this.thetanContract = new web3.eth.Contract(MARKETPLACE_ABI, MARKETPLACE_CONTRACT_ADDRESS);
	}

	public async connect(): Promise<void> {
		if (this.connectIntervalTimer) {
			clearIntervalAsync(this.connectIntervalTimer);
		}
		this.bearer = await this.login();
		this.connectIntervalTimer = setIntervalAsync(async () => {
			this.bearer = await this.login();
		}, cts.MARKETPLACE_LOGIN_INTERVAL);
	}

	private async login(): Promise<string> {
		const loginNonceReq = await axios({
			url: `https://data.thetanarena.com/thetan/v1/authentication/nonce?Address=${this.wallet.address}`,
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'accept-language': 'en-US,en;q=0.9',
				'cache-control': 'max-age=0',
				'content-type': 'application/json',
				'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Linux"',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				Referer: 'https://marketplace.thetanarena.com/',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
			data: null,
		});
		if (loginNonceReq.status !== 200 && !loginNonceReq.data.success) {
			throw new Error('Failed to get login nonce');
		}
		const loginNonce = String(loginNonceReq.data.data.nonce);
		const userSignature = this.web3.eth.accounts.sign(loginNonce, this.wallet.privateKey).signature;

		const loginReq = await axios({
			url: 'https://data.thetanarena.com/thetan/v1/authentication/token',
			method: 'POST',
			headers: {
				accept: 'application/json',
				'accept-language': 'en-US,en;q=0.9',
				'cache-control': 'max-age=0',
				'content-type': 'application/json',
				'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Linux"',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				Referer: 'https://marketplace.thetanarena.com/',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
			data: `{"address":"${this.wallet.address}","signature": "${userSignature}"}`,
		});
		if (loginReq.status !== 200 && !loginReq.data.success) {
			throw new Error('Failed to login');
		}

		return loginReq.data.data.accessToken || '';
	}

	private async getSellerSignature(thetanId: string): Promise<string> {
		if (!this.bearer) {
			throw new Error('Not logged in, call connect() first');
		}

		const sellerSignatureReq = await axios({
			url: `https://data.thetanarena.com/thetan/v1/items/${thetanId}/signed-signature?id=${thetanId}`,
			method: 'GET',
			headers: {
				accept: 'application/json',
				'accept-language': 'en-US,en;q=0.9',
				authorization: `Bearer ${this.bearer}`,
				'cache-control': 'max-age=0',
				'content-type': 'application/json',
				'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Linux"',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				Referer: 'https://marketplace.thetanarena.com/',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
			data: null,
		});
		if (sellerSignatureReq.status !== 200 && !sellerSignatureReq.data.success) {
			throw new Error('Failed to get seller signature');
		}

		return sellerSignatureReq.data.data;
	}

	// FIXME: set a minimum bnb balance like 10$ or something
	private async checkBNBBalance(): Promise<boolean> {
		const bnbBalance = await this.wallet.getBNBBalance();
		if (bnbBalance < GAS_LIMIT * GAS_UNIT_PRICE_GWEI * 1e-9) {
			console.log(`BNB balance is too low to pay the fees. Balance: ${bnbBalance}`);
			return false;
		}
		return true;
	}

	private async checkWBNBBalance(thetanPrice: number): Promise<boolean> {
		const wbnbBalance = await this.wallet.getWBNBBalance();
		if (wbnbBalance < thetanPrice) {
			console.log(`WBNB balance is too low. Balance: ${wbnbBalance}`);
			return false;
		}
		return true;
	}

	public async buyThetan(
		thetanId: string,
		tokenId: string,
		thetanPrice: number,
		sellerAddress: string
	): Promise<void> {
		const isBnbBalanceValid = await this.checkBNBBalance();
		if (!isBnbBalanceValid) process.exit();
		const isWbnbBalanceValid = await this.checkWBNBBalance(thetanPrice);
		if (!isWbnbBalanceValid) return;
		const sellerSignature = await this.getSellerSignature(thetanId);
		if (!sellerSignature) return;

		const saltNonce = 0; // Math.round(new Date().getTime() / 1000);

		try {
			console.log(`Buying thetan ${thetanId} for ${parseInt(thetanPrice.toString()) / 1e18} WBNB`);
			const res = await this.thetanContract.methods
				.matchTransaction(
					[sellerAddress, THETAN_HERO_CONTRACT_ADDRESS, WBNB_CONTRACT_ADDRESS],
					[
						this.web3.utils.toBN(tokenId).toString(),
						thetanPrice.toString(),
						this.web3.utils.toHex(saltNonce),
					],
					sellerSignature
				)
				.send({ from: this.wallet.address, gas: GAS_LIMIT, gasPrice: GAS_UNIT_PRICE_GWEI * 1e9 });
			console.log(res);
		} catch (e) {
			console.log(`Failed to buy thetan ${thetanId} for ${parseInt(thetanPrice.toString()) / 1e18}`);
		}
	}

	public async sellThetan(thetanId: string): Promise<void> {}

	public async getThetans(): Promise<any[]> {
		try {
			const startTime = process.hrtime();
			const response = await axios.get(urls.GET_THETANS);
			const endTime = process.hrtime(startTime);
			console.log(`listThetans took ${endTime[0] * 1000 + endTime[1] / 1000000}ms`);
			if (!response.data.success) {
				console.log(`Error fetching thetans`);
				return [];
			}
			return response.data.data;
		} catch (error) {
			console.log(`Error getting thetans: ${error}`);
			return [];
		}
	}
}

export { Marketplace };
