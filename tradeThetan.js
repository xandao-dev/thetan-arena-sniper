import Web3 from 'web3';
import dotenv from 'dotenv';
dotenv.config();

/* Trading Bot Constants */
const THETAN_HERO_CONTRACT_ADDRESS = '0x98eb46cbf76b19824105dfbcfa80ea8ed020c6f4';
const THETAN_MARKETPLACE_CONTRACT_ADDRESS = '0x54ac76f9afe0764e6a8ed6c4179730e6c768f01c';
const THETAN_MARKETPLACE_ABI = [
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
const WBNB_CONTRACT_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const WBNB_ABI = [
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

const GAS_LIMIT = 350000; // Got this from thetan marketplace transaction
const GAS_UNIT_PRICE_GWEI = 6; // 1 gwei = 10^-9 BNB

const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
const account = web3.eth.accounts.privateKeyToAccount(process.env.WALLET_PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

async function checkBnbBalance() {
	const bnbBalance = (await web3.eth.getBalance(process.env.WALLET_ADDRESS)) / 1e18;
	if (bnbBalance < GAS_LIMIT * GAS_UNIT_PRICE_GWEI * 1e-9) {
		console.log('BNB balance is too low to pay the fees');
		return false;
	}
	return true;
}

async function checkWbnbBalance(thetanPrice) {
	const wbnbContract = new web3.eth.Contract(WBNB_ABI, WBNB_CONTRACT_ADDRESS);
	const wbnbBalance = await wbnbContract.methods.balanceOf(process.env.WALLET_ADDRESS).call();
	console.log(`WBNB balance: ${wbnbBalance / 1e18}`);
	console.log(`Thetan price: ${thetanPrice / 1e18}`);
	if (wbnbBalance < thetanPrice) {
		console.log('WBNB balance is too low');
		return false;
	}
	return true;
}

async function buyThetan(thetanId, thetanPrice, sellerAddress) {
	const isBnbBalanceValid = await checkBnbBalance();
	if (!isBnbBalanceValid) process.exit();
	const isWbnbBalanceValid = await checkWbnbBalance(thetanPrice);
	if (!isWbnbBalanceValid) return;

	const transactionFee = await thetanContract.methods.transactionFee().call();

	console.log(`Buying thetan ${thetanId} for ${thetanPrice}`);
	const thetanContract = new web3.eth.Contract(THETAN_MARKETPLACE_ABI, THETAN_MARKETPLACE_CONTRACT_ADDRESS);
	const result = await thetanContract.methods.matchTransaction(
		thetanId,
		THETAN_HERO_CONTRACT_ADDRESS,
		thetanPrice,
		WBNB_CONTRACT_ADDRESS,
		sellerAddress,
		process.env.WALLET_ADDRESS,
		transactionFee
	);
	console.log(`Transaction: ${result}`);
	// FIXME, buy once to test
	process.exit();
}

async function sellThetan(thetanId, thetanPrice) {
	// TODO
}

export { buyThetan, sellThetan };
