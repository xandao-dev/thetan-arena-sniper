import Web3 from 'web3';
import dotenv from 'dotenv';
import axios from 'axios';
import { setAsyncInterval, clearAsyncInterval } from './asyncInterval.js';
dotenv.config();

/* Trading Bot Constants */
const THETAN_HERO_CONTRACT_ADDRESS: string = '0x98eb46cbf76b19824105dfbcfa80ea8ed020c6f4';
const THETAN_MARKETPLACE_CONTRACT_ADDRESS: string = '0x54ac76f9afe0764e6a8ed6c4179730e6c768f01c';
const THETAN_MARKETPLACE_ABI: any[] = [
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
			{ indexed: false, internalType: 'address', name: 'contractAddress', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'price', type: 'uint256' },
			{ indexed: false, internalType: 'address', name: 'paymentToken', type: 'address' },
			{ indexed: false, internalType: 'address', name: 'seller', type: 'address' },
			{ indexed: false, internalType: 'address', name: 'buyer', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'fee', type: 'uint256' },
		],
		name: 'MatchTransaction',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'newOwner', type: 'address' },
		],
		name: 'OwnershipTransferred',
		type: 'event',
	},
	{
		inputs: [],
		name: 'feeToAddress',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes32', name: '_messageHash', type: 'bytes32' }],
		name: 'getEthSignedMessageHash',
		outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: '_nftAddress', type: 'address' },
			{ internalType: 'uint256', name: '_tokenId', type: 'uint256' },
			{ internalType: 'address', name: '_paymentErc20', type: 'address' },
			{ internalType: 'uint256', name: '_price', type: 'uint256' },
			{ internalType: 'uint256', name: '_saltNonce', type: 'uint256' },
		],
		name: 'getMessageHash',
		outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address[2]', name: 'addresses', type: 'address[2]' },
			{ internalType: 'uint256[3]', name: 'values', type: 'uint256[3]' },
			{ internalType: 'bytes', name: 'signature', type: 'bytes' },
		],
		name: 'ignoreSignature',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address[3]', name: 'addresses', type: 'address[3]' },
			{ internalType: 'uint256[3]', name: 'values', type: 'uint256[3]' },
			{ internalType: 'bytes', name: 'signature', type: 'bytes' },
		],
		name: 'matchTransaction',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'owner',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: '', type: 'address' }],
		name: 'paymentTokens',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'bytes32', name: '_ethSignedMessageHash', type: 'bytes32' },
			{ internalType: 'bytes', name: '_signature', type: 'bytes' },
		],
		name: 'recoverSigner',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address[]', name: '_removedPaymentTokens', type: 'address[]' }],
		name: 'removePaymentTokens',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{ inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
	{
		inputs: [{ internalType: 'address', name: '_feeToAddress', type: 'address' }],
		name: 'setFeeToAddress',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address[]', name: '_paymentTokens', type: 'address[]' }],
		name: 'setPaymentTokens',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'uint256', name: '_transactionFee', type: 'uint256' }],
		name: 'setTransactionFee',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes', name: 'sig', type: 'bytes' }],
		name: 'splitSignature',
		outputs: [
			{ internalType: 'bytes32', name: 'r', type: 'bytes32' },
			{ internalType: 'bytes32', name: 's', type: 'bytes32' },
			{ internalType: 'uint8', name: 'v', type: 'uint8' },
		],
		stateMutability: 'pure',
		type: 'function',
	},
	{
		inputs: [],
		name: 'transactionFee',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
		name: 'transferOwnership',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
		name: 'usedSignatures',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function',
	},
];
const WBNB_CONTRACT_ADDRESS: string = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const WBNB_ABI: any[] = [
	{
		constant: true,
		inputs: [],
		name: 'name',
		outputs: [{ name: '', type: 'string' }],
		payable: false,
		stateMutability: 'view',
		type: 'function',
	},
	{
		constant: false,
		inputs: [
			{ name: 'guy', type: 'address' },
			{ name: 'wad', type: 'uint256' },
		],
		name: 'approve',
		outputs: [{ name: '', type: 'bool' }],
		payable: false,
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		constant: true,
		inputs: [],
		name: 'totalSupply',
		outputs: [{ name: '', type: 'uint256' }],
		payable: false,
		stateMutability: 'view',
		type: 'function',
	},
	{
		constant: false,
		inputs: [
			{ name: 'src', type: 'address' },
			{ name: 'dst', type: 'address' },
			{ name: 'wad', type: 'uint256' },
		],
		name: 'transferFrom',
		outputs: [{ name: '', type: 'bool' }],
		payable: false,
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		constant: false,
		inputs: [{ name: 'wad', type: 'uint256' }],
		name: 'withdraw',
		outputs: [],
		payable: false,
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		constant: true,
		inputs: [],
		name: 'decimals',
		outputs: [{ name: '', type: 'uint8' }],
		payable: false,
		stateMutability: 'view',
		type: 'function',
	},
	{
		constant: true,
		inputs: [{ name: '', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ name: '', type: 'uint256' }],
		payable: false,
		stateMutability: 'view',
		type: 'function',
	},
	{
		constant: true,
		inputs: [],
		name: 'symbol',
		outputs: [{ name: '', type: 'string' }],
		payable: false,
		stateMutability: 'view',
		type: 'function',
	},
	{
		constant: false,
		inputs: [
			{ name: 'dst', type: 'address' },
			{ name: 'wad', type: 'uint256' },
		],
		name: 'transfer',
		outputs: [{ name: '', type: 'bool' }],
		payable: false,
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		constant: false,
		inputs: [],
		name: 'deposit',
		outputs: [],
		payable: true,
		stateMutability: 'payable',
		type: 'function',
	},
	{
		constant: true,
		inputs: [
			{ name: '', type: 'address' },
			{ name: '', type: 'address' },
		],
		name: 'allowance',
		outputs: [{ name: '', type: 'uint256' }],
		payable: false,
		stateMutability: 'view',
		type: 'function',
	},
	{ payable: true, stateMutability: 'payable', type: 'fallback' },
	{
		anonymous: false,
		inputs: [
			{ indexed: true, name: 'src', type: 'address' },
			{ indexed: true, name: 'guy', type: 'address' },
			{ indexed: false, name: 'wad', type: 'uint256' },
		],
		name: 'Approval',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, name: 'src', type: 'address' },
			{ indexed: true, name: 'dst', type: 'address' },
			{ indexed: false, name: 'wad', type: 'uint256' },
		],
		name: 'Transfer',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, name: 'dst', type: 'address' },
			{ indexed: false, name: 'wad', type: 'uint256' },
		],
		name: 'Deposit',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, name: 'src', type: 'address' },
			{ indexed: false, name: 'wad', type: 'uint256' },
		],
		name: 'Withdrawal',
		type: 'event',
	},
];
const GAS_LIMIT: number = 350000; // Got this from thetan marketplace transaction
const GAS_UNIT_PRICE_GWEI: number = 6; // 1 gwei = 10^-9 BNB

if (!process.env.WALLET_PRIVATE_KEY) {
	throw new Error('WALLET_PRIVATE_KEY not set');
}

let marketplaceBearerToken: string;
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
const account = web3.eth.accounts.privateKeyToAccount(process.env.WALLET_PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

async function checkBnbBalance() {
	const balance = await web3.eth.getBalance(account.address);
	const bnbBalance = parseInt(balance) / 1e18;
	if (bnbBalance < GAS_LIMIT * GAS_UNIT_PRICE_GWEI * 1e-9) {
		console.log('BNB balance is too low to pay the fees');
		return false;
	}
	return true;
}

async function checkWbnbBalance(thetanPrice: BigInt) {
	const wbnbContract = new web3.eth.Contract(WBNB_ABI, WBNB_CONTRACT_ADDRESS);
	const wbnbBalance = await wbnbContract.methods.balanceOf(account.address).call();

	if (wbnbBalance < thetanPrice) {
		console.log('WBNB balance is too low');
		return false;
	}
	return true;
}

async function thetanLogin() {
	const loginNonceReq = await axios({
		url: `https://data.thetanarena.com/thetan/v1/authentication/nonce?Address=${account.address}`,
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
		console.log('Failed to get login nonce');
		return false;
	}
	const loginNonce = String(loginNonceReq.data.data.nonce);
	if (!process.env.WALLET_PRIVATE_KEY) {
		console.log('WALLET_PRIVATE_KEY not set');
		return false;
	}
	const userSignature = web3.eth.accounts.sign(loginNonce, process.env.WALLET_PRIVATE_KEY).signature;

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
		data: `{"address":"${account.address}","signature": "${userSignature}"}`,
	});
	if (loginReq.status !== 200 && !loginReq.data.success) {
		console.log('Failed to login');
		return false;
	}

	return loginReq.data.data.accessToken || '';
}

async function getSellerSignature(thetanId: string, bearerToken: string) {
	const sellerSignatureReq = await axios({
		url: `https://data.thetanarena.com/thetan/v1/items/${thetanId}/signed-signature?id=${thetanId}`,
		method: 'GET',
		headers: {
			accept: 'application/json',
			'accept-language': 'en-US,en;q=0.9',
			authorization: `Bearer ${bearerToken}`,
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
		console.log('Failed to get seller signature');
		return false;
	}

	return sellerSignatureReq.data.data;
}

async function buyThetan(thetanId: string, tokenId: string, thetanPrice: BigInt, sellerAddress: string) {
	const isBnbBalanceValid = await checkBnbBalance();
	if (!isBnbBalanceValid) process.exit();
	const isWbnbBalanceValid = await checkWbnbBalance(thetanPrice);
	if (!isWbnbBalanceValid) return;
	const sellerSignature = await getSellerSignature(thetanId, marketplaceBearerToken);
	if (!sellerSignature) return;

	// const nonce = await web3.eth.getTransactionCount(account.address);
	const thetanContract = new web3.eth.Contract(THETAN_MARKETPLACE_ABI, THETAN_MARKETPLACE_CONTRACT_ADDRESS);
	const saltNonce = 0; // Math.round(new Date().getTime() / 1000);

	try {
		console.log(`Buying thetan ${thetanId} for ${parseInt(thetanPrice.toString()) / 1e18} WBNB`);

		// address[3] [seller_address,nft_address,payment_token_address]
		// uint256[3] [token_id,price,salt_nonce]
		// bytes seller_signature
		const res = await thetanContract.methods
			.matchTransaction(
				[sellerAddress, THETAN_HERO_CONTRACT_ADDRESS, WBNB_CONTRACT_ADDRESS],
				[web3.utils.toBN(tokenId).toString(), thetanPrice.toString(), web3.utils.toHex(saltNonce)],
				sellerSignature
			)
			.send({ from: account.address, gas: GAS_LIMIT, gasPrice: GAS_UNIT_PRICE_GWEI * 1e9 });
		console.log(res);
	} catch (e) {
		console.log(`Failed to buy thetan ${thetanId} for ${parseInt(thetanPrice.toString()) / 1e18}`);
	}
}

async function sellThetan(thetanId: string, thetanPrice: BigInt) {
	// TODO
}

(async () => {
	marketplaceBearerToken = await thetanLogin();
	setAsyncInterval(async () => {
		marketplaceBearerToken = await thetanLogin();
	}, 86400);
})();

export { buyThetan, sellThetan };
