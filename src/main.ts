import Web3 from 'web3';
import { Marketplace } from './Marketplace.js';
import { Wallet } from './Wallet.js';
import { CoinWatcher } from './CoinWatcher.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
	const earnExpectPercentage = parseFloat(process.argv[3]) || 0.5;
	console.log('Earn expect percentage: ' + earnExpectPercentage);

	const web3 = new Web3(process.env.BSC_PROVIDER || 'https://data-seed-prebsc-1-s1.binance.org:8545');
	const wallet = new Wallet(web3);
	const coinWatcher = new CoinWatcher(10000);
	await coinWatcher.start();

	console.log(`${await coinWatcher.fetchCoin('BNB')}`);
	console.log(`${await wallet.getBNBBalance()} BNB`);
	console.log(`${await wallet.getWBNBBalance()} WBNB`);
}

try {
	main();
} catch (e: any) {
	console.log(`Error: ${e}`);
	console.log('Restarting...');
	main();
}
