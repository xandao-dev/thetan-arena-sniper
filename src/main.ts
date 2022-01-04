import puppeteer from 'puppeteer';
import Web3 from 'web3';
import axios from 'axios';
import { setAsyncInterval } from './utils/asyncInterval.js';
import { Marketplace } from './Marketplace.js';
import { Wallet } from './Wallet.js';
import colors from 'colors';
import dotenv from 'dotenv';
dotenv.config();

/* Thetan Routine Constants */
const myFundsDollar = parseFloat(process.argv[2]) || 120;

const EARN_EXPECT_PERCENTAGE = parseFloat(process.argv[3]) || 0.5;

const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
async function main() {
	console.log('My funds: ' + MY_FUNDS_DOLLAR);
	console.log('Earn expect percentage: ' + EARN_EXPECT_PERCENTAGE);

	thetanRoutine();
}

try {
	main();
} catch (e: any) {
	console.log(`Error: ${e}`);
	console.log('Restarting...');
	main();
}
