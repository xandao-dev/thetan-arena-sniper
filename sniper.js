import puppeteer from 'puppeteer';
import { setAsyncInterval, clearAsyncInterval } from './asyncInterval.js';
import colors from 'colors';
import beep from 'beepbeep';

/* Thetan Routine Constants */
const MY_FUNDS_DOLLAR = parseFloat(process.argv[2]) || 120;
const WIN_RATE = 0.5;
const EARN_EXPECT_PERCENTAGE = parseFloat(process.argv[3]) || 0.5;
const THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC = [9.25, 12.5, 29.55];
const FETCH_THETANS = 'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=0&from=0&size=50';
const FETCH_THETANS_INTERVAL = 2500 + Math.floor(Math.random() * 2001) - 1000;

/* Coin Prices Routine Constants */
const FETCH_THC = 'https://poocoin.app/tokens/0x24802247bd157d771b7effa205237d8e9269ba8a';
const FETCH_BNB = 'https://poocoin.app/tokens/bnb';
const FETCH_COINS_INTERVAL = 60000 + Math.floor(Math.random() * 5001) - 2500;

let thcPriceDollar = null;
let bnbPriceDollar = null;

async function main() {
	console.log('My funds: ' + MY_FUNDS_DOLLAR);
	console.log('Earn expect percentage: ' + EARN_EXPECT_PERCENTAGE);

	coinPricesRoutine();
	thetanRoutine();
}

async function thetanRoutine() {
	let lastGoodThetansIds = [];

	async function openThetanMarketplace() {
		const browser = await puppeteer.launch();
		const [page] = await browser.pages();
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
		);
		await page.goto(FETCH_THETANS, { waitUntil: 'networkidle2' });
		return page;
	}

	async function getThetans(page) {
		await page.reload({ waitUntil: 'networkidle2' });
		await page.waitForSelector('body > pre');
		let body = await page.$('body > pre');
		let data = await page.evaluate((el) => el.innerText, body);
		data = JSON.parse(data);
		if (data.success === true) {
			return data?.data || [];
		}
		return [];
	}

	async function getBestThetans(thetans) {
		let bestThetans = thetans;
		if (!bestThetans || bestThetans?.length === 0) {
			console.log('No thetans found.');
			return [];
		}
		if (thcPriceDollar === null || bnbPriceDollar === null) {
			console.log('Waiting for coin prices...');
			return [];
		}

		console.log('Thetans number: ' + bestThetans.length);

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
		bestThetans = bestThetans.filter((hero) => (hero.price / 10e7) * bnbPriceDollar < MY_FUNDS_DOLLAR);
		console.log(`Thetans number (less than ${MY_FUNDS_DOLLAR}$): ${bestThetans.length}`);

		// earn potential percentage higher than EARN_EXPECT_PERCENTAGE
		bestThetans = bestThetans.filter((hero, index) => {
			const earnPotential =
				hero.battleCap * thcPriceDollar * WIN_RATE * THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC[hero.heroRarity];
			const earnRate = (earnPotential * 10e7) / (hero.price * bnbPriceDollar) - 1;
			if (earnRate >= EARN_EXPECT_PERCENTAGE) {
				bestThetans[index].earnPotentialDollar = earnPotential.toFixed(2);
				bestThetans[index].earnRatePercentage = (earnRate * 100).toFixed(2);
				bestThetans[index].heroPriceDollar = ((hero.price * bnbPriceDollar) / 10e7).toFixed(2);
			}
			return earnRate >= EARN_EXPECT_PERCENTAGE;
		});
		console.log(`Thetans number (good earn potential): ${bestThetans.length}`);

		return bestThetans;
	}

	function filterAlreadyListedThetans(bestThetans) {
		for (let i = 0; i < bestThetans.length; i++) {
			if (lastGoodThetansIds.includes(bestThetans[i].id)) {
				bestThetans.splice(i, 1);
				i--;
			}
		}
		return bestThetans;
	}

	function logBestThetans(bestThetans) {
		bestThetans.forEach((hero) => {
			console.log(
				colors.brightGreen(
					`${hero.name}(${hero.id.slice(0, 8)}):
	Date Listed: ${new Date(Date.now()).toLocaleString()}
	Price: $${hero.heroPriceDollar}
	Earn Potential: $${hero.earnPotentialDollar}
	Earn Rate: ${hero.earnRatePercentage}%
	Link: https://marketplace.thetanarena.com/item/${hero.refId}`
				)
			);
		});
	}

	const page = await openThetanMarketplace();
	setAsyncInterval(async () => {
		const thetans = await getThetans(page);
		const bestThetans = await getBestThetans(thetans);
		const bestThetansFiltered = await filterAlreadyListedThetans(bestThetans);

		if (bestThetansFiltered && bestThetansFiltered.length > 0) {
			beep();
			logBestThetans(bestThetansFiltered);
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
		const thcPrice = parseFloat(titleTHC.split('$')[1]);
		if (typeof thcPrice !== 'number') thcPrice = null;
		console.log('UPDATE: THC price: ' + thcPrice);

		// Get BNB price
		await page.goto(FETCH_BNB);
		await page.waitForXPath(`.//*[contains(text(), 'Wrapped BNB price chart')]`);
		const titleBNB = await page.title();
		const bnbPrice = parseFloat(titleBNB.split('$')[1]);
		if (typeof bnbPrice !== 'number') bnbPrice = null;
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
	console.error(e.message);
	console.log('restarting...');
	main();
}
