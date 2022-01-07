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
import { CoinWatcher } from './CoinWatcher.js';

interface IGas {
	gas: number;
	gasPrice: number;
}

class Marketplace {
	private wallet: Wallet;
	private coinWatcher: CoinWatcher;
	private web3: Web3;
	private bearer?: string;
	private connectIntervalTimer?: SetIntervalAsyncTimer;
	private connected: boolean = false;
	private thetanContract: Contract;

	constructor(web3: Web3, wallet: Wallet, coinWatcher: CoinWatcher) {
		if (!web3) {
			throw new Error('Web3 is not set');
		}
		if (!wallet) {
			throw new Error('Wallet not set');
		}
		if (!coinWatcher) {
			throw new Error('Coin watcher not set');
		}
		this.web3 = web3;
		this.wallet = wallet;
		this.coinWatcher = coinWatcher;
		this.thetanContract = new web3.eth.Contract(MARKETPLACE_ABI, MARKETPLACE_CONTRACT_ADDRESS);
	}

	public async connect(): Promise<void> {
		if (this.connected) {
			return;
		}
		try {
			this.bearer = await this.login();
			this.connectIntervalTimer = setIntervalAsync(async () => {
				this.bearer = await this.login();
			}, cts.MARKETPLACE_LOGIN_INTERVAL);
			this.connected = true;
		} catch (e: any) {
			throw new Error(`Error connecting to marketplace: ${e.message}`);
		}
	}

	public async disconnect(): Promise<void> {
		if (this.connectIntervalTimer) {
			clearIntervalAsync(this.connectIntervalTimer);
		}
		this.connected = false;
	}

	private async login(): Promise<string> {
		let loginNonce = '';
		try {
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
			if (loginNonceReq.status !== 200) {
				throw new Error(`Network error: ${loginNonceReq.status}`);
			}
			if (!loginNonceReq.data.success) {
				throw new Error(`API error: ${loginNonceReq.data?.code} - ${loginNonceReq.data?.status}`);
			}
			if (!loginNonceReq.data?.data?.nonce) {
				throw new Error(`API error: no nonce returned`);
			}
			loginNonce = String(loginNonceReq.data.data.nonce);
		} catch (e: any) {
			throw new Error(`Error getting nonce: ${e.message}`);
		}

		let userSignature = '';
		try {
			userSignature = this.web3.eth.accounts.sign(loginNonce, this.wallet.privateKey).signature;
		} catch (e: any) {
			throw new Error(`Error getting user signature: ${e.message}`);
		}

		let bearer = '';
		try {
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
			if (loginReq.status !== 200) {
				throw new Error(`Network error: ${loginReq.status}`);
			}
			if (!loginReq.data.success) {
				throw new Error(`API error: ${loginReq.data?.code} - ${loginReq.data?.status}`);
			}
			if (!loginReq.data?.data?.accessToken) {
				throw new Error(`API error: no bearer returned`);
			}
			bearer = String(loginReq.data.data.accessToken);
		} catch (e: any) {
			throw new Error(`Error logging in: ${e.message}`);
		}
		return bearer;
	}

	private async getSellerSignature(thetanId: string): Promise<string> {
		try {
			const req = await axios({
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
				withCredentials: true,
			});
			if (req.status !== 200) {
				throw new Error(`Network error: ${req.status}`);
			}
			if (!req.data.success) {
				throw new Error(`API error: ${req.data.code} - ${req.data.status}`);
			}
			if (!req.data?.data) {
				throw new Error(`API error: no seller signature returned`);
			}
			return req.data.data;
		} catch (e: any) {
			throw new Error(`Error getting seller signature: ${e.message}`);
		}
	}

	private async getSaltNonce(thetanId: string): Promise<number> {
		try {
			const req = await axios({
				url: `https://data.thetanarena.com/thetan/v1/items/${thetanId}?id=${thetanId}`,
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
				withCredentials: true,
			});
			if (req.status !== 200) {
				throw new Error(`Network error: ${req.status}`);
			}
			if (!req.data.success) {
				throw new Error(`API error: ${req.data.code} - ${req.data.status}`);
			}
			if (!req.data?.data?.saltNonce) {
				throw new Error(`API error: no saltNonce returned`);
			}
			return req.data.data.saltNonce;
		} catch (e: any) {
			throw new Error(`Error getting saltNonce: ${e.message}`);
		}
	}

	private async estimateGas(thetanPrice: number, earnPotentialDollar: number): Promise<IGas> {
		try {
			const gasPriceGweiToDollar = (gwei: number) =>
				(cts.MARKETPLACE_BUY_GAS * gwei * this.coinWatcher.coins.BNB) / 1e9;

			const dollarToGasPriceGwei = (dollar: number) =>
				Math.round((dollar * 1e9) / (cts.MARKETPLACE_BUY_GAS * this.coinWatcher.coins.BNB));

			// We sell based on earnPotentialDollar (controlled by win rate)
			// The profit is affected by the marketplace fee
			const thetanPriceDollar = (thetanPrice / 1e8) * this.coinWatcher.coins.BNB;
			const thetanSellProfit = thetanPriceDollar - earnPotentialDollar / (1 - cts.MARKETPLACE_SELL_FEE);

			const minimumGasDollar = gasPriceGweiToDollar(cts.MARKETPLACE_MIN_GAS_PRICE);
			if (thetanSellProfit <= minimumGasDollar) {
				throw new Error(`Thetan sell profit is negative (${thetanSellProfit})`);
			}

			// We set gas price based on a percentage of the thetanSellProfit
			let gasPriceGwei = dollarToGasPriceGwei(thetanSellProfit * cts.MARKETPLACE_PROFIT_TO_GAS_RATIO);
			if (gasPriceGwei >= cts.MARKETPLACE_MAX_GAS_PRICE) {
				gasPriceGwei = cts.MARKETPLACE_MAX_GAS_PRICE;
			}
			if (gasPriceGwei <= cts.MARKETPLACE_MIN_GAS_PRICE) {
				gasPriceGwei = cts.MARKETPLACE_MIN_GAS_PRICE;
			}

			return {
				gas: cts.MARKETPLACE_BUY_GAS,
				gasPrice: gasPriceGwei * 1e9,
			};
		} catch (e: any) {
			throw new Error(`Error estimating gas: ${e.message}`);
		}
	}

	public async buyThetan(
		thetanId: string,
		tokenId: string,
		thetanPrice: number,
		earnPotentialDollar: number,
		sellerAddress: string
	): Promise<any> {
		let gasPrice = 0;
		let gas = 0;
		try {
			const sellerSignature = await this.getSellerSignature(thetanId);
			const saltNonce = await this.getSaltNonce(thetanId);
			({ gas, gasPrice } = await this.estimateGas(thetanPrice, earnPotentialDollar));
			const price = BigInt(thetanPrice * 1e10); // price*1e18/1e8;
			console.log(`Buying thetan ${thetanId} for ${parseInt(thetanPrice.toString()) / 1e18} WBNB`);
			const tx = await this.thetanContract.methods
				.matchTransaction(
					[sellerAddress, THETAN_HERO_CONTRACT_ADDRESS, WBNB_CONTRACT_ADDRESS],
					[this.web3.utils.toBN(tokenId).toString(), price.toString(), this.web3.utils.toHex(saltNonce)],
					sellerSignature
				)
				.send({ from: this.wallet.address, gas, gasPrice });
			return {
				success: true,
				tx: { ...tx, gasPrice: gasPrice / 1e9 },
			};
		} catch (e: any) {
			return {
				success: false,
				message: e.message,
				tx: { ...e, gasPrice: gasPrice / 1e9 },
			};
		}
	}

	public async sellThetan(thetanId: string): Promise<void> {}

	public async getThetans(): Promise<any[]> {
		try {
			const startTime = process.hrtime();
			const req = await axios.get(urls.GET_THETANS);
			const endTime = process.hrtime(startTime);
			console.log(`listThetans took ${endTime[0] * 1000 + endTime[1] / 1000000}ms`);

			if (req.status !== 200) {
				throw new Error(`Network error: ${req.status}`);
			}
			if (!req.data.success) {
				throw new Error(`API error: ${req.data.code} - ${req.data.status}`);
			}
			if (!req.data?.data) {
				throw new Error(`API error: no thetans returned`);
			}
			return req.data.data;
		} catch (error) {
			console.log(`Error getting thetans: ${error}`);
			return [];
		}
	}
}

export { Marketplace };
