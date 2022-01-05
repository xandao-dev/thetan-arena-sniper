import Web3 from 'web3';
import { Marketplace } from './Marketplace.js';
import { Wallet } from './Wallet.js';
import { WalletWatcher } from './WalletWatcher.js';
import { CoinWatcher } from './CoinWatcher.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
	const earnExpectPercentage = parseFloat(process.argv[3]) || 0.5;
	console.log('Earn expect percentage: ' + earnExpectPercentage);

	const web3 = new Web3(process.env.BSC_PROVIDER || 'https://data-seed-prebsc-1-s1.binance.org:8545');
	const wallet = new Wallet(web3);

	const walletWatcher = new WalletWatcher(wallet);
	await walletWatcher.start();

	const coinWatcher = new CoinWatcher();
	await coinWatcher.start();

	const marketplace = new Marketplace(web3, wallet);
}

try {
	main();
} catch (e: any) {
	console.log(`Error: ${e}`);
	console.log('Restarting...');
	main();
}
