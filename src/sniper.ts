import puppeteer from 'puppeteer';
import axios from 'axios';
import { setAsyncInterval, clearAsyncInterval } from './asyncInterval.js';
import { buyThetan, sellThetan } from './tradeThetan.js';
import colors from 'colors';
// @ts-ignore
import beep from 'beepbeep';

/* Thetan Routine Constants */
const MY_FUNDS_DOLLAR = parseFloat(process.argv[2]) || 120;
const WIN_RATE = 0.5;
const EARN_EXPECT_PERCENTAGE = parseFloat(process.argv[3]) || 0.5;
const THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC = [9.25, 12.5, 29.55];
const FETCH_THETANS = 'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=0&from=0&size=10';
const FETCH_THETANS_INTERVAL = 500;

/* Coin Prices Routine Constants */
const FETCH_THC = 'https://poocoin.app/tokens/0x24802247bd157d771b7effa205237d8e9269ba8a';
const FETCH_BNB = 'https://poocoin.app/tokens/bnb';
const FETCH_COINS_INTERVAL = 45000;

let thcPriceDollar: number = 0;
let bnbPriceDollar: number = 0;

async function main() {
	console.log('My funds: ' + MY_FUNDS_DOLLAR);
	console.log('Earn expect percentage: ' + EARN_EXPECT_PERCENTAGE);

	coinPricesRoutine();
	thetanRoutine();
}

async function thetanRoutine() {
	let lastGoodThetansIds: any[] = [];

	async function getThetans() {
		try {
			const response = await axios.get(FETCH_THETANS);
			if (response.data.success) {
				return response.data.data;
			}
			console.log(`Error fetching thetans`);
			return [];
		} catch (error) {
			console.log(`Error getting thetans: ${error}`);
			return [];
		}
	}

	async function getBestThetans(thetans: any[]) {
		let bestThetans = thetans;
		if (!bestThetans || bestThetans?.length === 0) {
			console.log('No thetans found.');
			return [];
		}
		if (!thcPriceDollar || !bnbPriceDollar) {
			console.log('Waiting for coin prices...');
			return [];
		}

		// console.log('Thetans number: ' + bestThetans.length);

		// Non sold
		// bestThetans = bestThetans.filter((hero) => hero.onMarketTime !== 0);
		// console.log('Thetans number (non sold): ' + bestThetans.length);

		// Listed 1h ago
		// bestThetans = bestThetans.filter((hero) => hero.onMarketTime > (new Date().getTime() - 36e5));
		// console.log('Thetans number (listed 1h ago): ' + bestThetans.length);

		// price higher than 50$ - because of bots
		// bestThetans = bestThetans.filter((hero) => (hero.price / 10e7) * bnbPriceDollar > 50);
		// console.log('Thetans number (higher than 50$): ' + bestThetans.length);

		// price lower than MY_FUNDS_DOLLAR
		bestThetans = bestThetans.filter((hero) => (hero.price / 1e8) * bnbPriceDollar < MY_FUNDS_DOLLAR);
		console.log(`Thetans number (less than ${MY_FUNDS_DOLLAR}$): ${bestThetans.length}`);

		// earn potential percentage higher than EARN_EXPECT_PERCENTAGE
		bestThetans = bestThetans.filter((hero, index) => {
			const earnPotential =
				hero.battleCap * thcPriceDollar * WIN_RATE * THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC[hero.heroRarity];
			const earnRate = (earnPotential * 1e8) / (hero.price * bnbPriceDollar) - 1;
			if (earnRate >= EARN_EXPECT_PERCENTAGE) {
				bestThetans[index].earnPotentialDollar = earnPotential.toFixed(2);
				bestThetans[index].earnRatePercentage = (earnRate * 100).toFixed(2);
				bestThetans[index].heroPriceDollar = ((hero.price * bnbPriceDollar) / 1e8).toFixed(2);
			}
			return earnRate >= EARN_EXPECT_PERCENTAGE;
		});
		console.log(`Thetans number (good earn potential): ${bestThetans.length}`);

		// Remove unwanted thetans
		bestThetans = bestThetans.filter((hero) => hero.name !== 'Veinka');

		return bestThetans;
	}

	function filterAlreadyListedThetans(bestThetans: any[]) {
		for (let i = 0; i < bestThetans.length; i++) {
			if (lastGoodThetansIds.includes(bestThetans[i].id)) {
				bestThetans.splice(i, 1);
				i--;
			}
		}
		return bestThetans;
	}

	function logBestThetans(bestThetans: any[]) {
		bestThetans.forEach((hero) => {
			console.log(
				// @ts-ignore
				colors.brightGreen(
					`${hero.name}(${hero.id.slice(0, 8)}):
	Current Time: ${new Date(Date.now()).toLocaleString()}
	Price: $${hero.heroPriceDollar}
	Earn Potential: $${hero.earnPotentialDollar}
	Earn Rate: ${hero.earnRatePercentage}%
	Link: https://marketplace.thetanarena.com/item/${hero.refId}`
				)
			);
		});
	}

	async function buyBestThetans(bestThetans: any[]) {
		if (bestThetans.length > 0) {
			const thetanPrice = BigInt((bestThetans[0].price / 1e8) * 1e18);
			await buyThetan(bestThetans[0].id, bestThetans[0].tokenId, thetanPrice, bestThetans[0].ownerAddress);
		}
	}

	setAsyncInterval(async () => {
		const thetans = await getThetans();
		const bestThetans = await getBestThetans(thetans);
		const bestThetansFiltered = filterAlreadyListedThetans(bestThetans);

		if (bestThetansFiltered && bestThetansFiltered.length > 0) {
			beep();
			logBestThetans(bestThetansFiltered);
			await buyBestThetans(bestThetansFiltered);
			lastGoodThetansIds.push(...bestThetansFiltered.map((hero) => hero.id));
		}
	}, FETCH_THETANS_INTERVAL);
}

async function coinPricesRoutine() {
	async function getCoinsPrice() {
		const browser = await puppeteer.launch();
		const [page] = await browser.pages();
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
		);

		// Get THC price
		await page.goto(FETCH_THC);
		await page.waitForXPath(`.//*[contains(text(), 'Thetan Coin price chart')]`);
		const titleTHC = await page.title();
		let thcPrice: number = parseFloat(titleTHC.split('$')[1]);
		if (!thcPrice) thcPrice = 0;
		console.log('UPDATE: THC price: ' + thcPrice);

		// Get BNB price
		await page.goto(FETCH_BNB);
		await page.waitForXPath(`.//*[contains(text(), 'Wrapped BNB price chart')]`);
		const titleBNB = await page.title();
		let bnbPrice: any = parseFloat(titleBNB.split('$')[1]);
		if (!bnbPrice) bnbPrice = 0;
		console.log('UPDATE: BNB price: ' + bnbPrice);

		await page.close();
		await browser.close();
		return [thcPrice, bnbPrice];
	}

	setAsyncInterval(async () => {
		[thcPriceDollar, bnbPriceDollar] = await getCoinsPrice();
	}, FETCH_COINS_INTERVAL);
}

try {
	main();
} catch (e) {
	console.error((e as Error).message);
	console.log('restarting...');
	main();
}
