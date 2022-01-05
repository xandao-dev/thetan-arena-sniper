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

interface IGas {
	gas: number;
	gasPrice: number;
}

class Marketplace {
	private wallet: Wallet;
	private web3: Web3;
	private bearer?: string;
	private connectIntervalTimer?: SetIntervalAsyncTimer;
	private connected: boolean = false;
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
		if (this.connected) {
			return;
		}
		this.connected = true;
		this.bearer = await this.login();
		this.connectIntervalTimer = setIntervalAsync(async () => {
			this.bearer = await this.login();
		}, cts.MARKETPLACE_LOGIN_INTERVAL);
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
				url: `'https://data.thetanarena.com/thetan/v1/items/${thetanId}?id=${thetanId}`,
				method: 'GET',
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
				data: null,
			});
			if (req.status !== 200) {
				throw new Error(`Network error: ${req.status}`);
			}
			if (!req.data.success) {
				throw new Error(`API error: ${req.data.code} - ${req.data.status}`);
			}
			if (!req.data?.saltNonce) {
				throw new Error(`API error: no saltNonce returned`);
			}
			return req.data.saltNonce;
		} catch (e: any) {
			throw new Error(`Error getting seller signature: ${e.message}`);
		}
	}

	private async estimateGas(): Promise<IGas> {
		return {
			gas: 300000,
			gasPrice: 10 * 1e9,
		};
	}

	public async buyThetan(
		thetanId: string,
		tokenId: string,
		thetanPrice: number,
		sellerAddress: string
	): Promise<void> {
		const sellerSignature = await this.getSellerSignature(thetanId);
		const saltNonce = await this.getSaltNonce(thetanId);
		const { gas, gasPrice } = await this.estimateGas();
		try {
			const price = BigInt(thetanPrice * 1e10); // price*1e8/1e18;
			console.log(`Buying thetan ${thetanId} for ${parseInt(thetanPrice.toString()) / 1e18} WBNB`);
			const tx = await this.thetanContract.methods
				.matchTransaction(
					[sellerAddress, THETAN_HERO_CONTRACT_ADDRESS, WBNB_CONTRACT_ADDRESS],
					[this.web3.utils.toBN(tokenId).toString(), price.toString(), this.web3.utils.toHex(saltNonce)],
					sellerSignature
				)
				.send({ from: this.wallet.address, gas, gasPrice });
			const receipt = await tx.wait();
			console.log(receipt);
			if (receipt.status === 1) {
				console.log(`Successfully bought thetan ${thetanId}`);
			}
		} catch (e: any) {
			console.log(`Failed to buy thetan ${thetanId} for ${parseInt(thetanPrice.toString()) / 1e18}`);
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
