const puppeteer = require('puppeteer');
const { setAsyncInterval, clearAsyncInterval } = require('./asyncInterval');

/* Thetan Routine Constants */
const MY_FUNDS_DOLLAR = 110;
const WIN_RATE = 0.5;
const EARN_EXPECT_PERCENTAGE = 0.1;
const THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC = [9.25, 12.5, 29.55];
const FETCH_THETANS = 'https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&batPercentMin=0&from=0&size=50';
const FETCH_THETANS_INTERVAL = 5000;

/* Coin Prices Routine Constants */
const FETCH_THC = 'https://poocoin.app/tokens/0x24802247bd157d771b7effa205237d8e9269ba8a';
const FETCH_BNB = 'https://poocoin.app/tokens/bnb';
const FETCH_COINS_INTERVAL = 30000 + Math.floor(Math.random() * 2001) - 1000;

let thcPriceDollar = null;
let bnbPriceDollar = null;

async function main() {
	thetanRoutine();
	coinPricesRoutine();
}

async function thetanRoutine() {
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
		const bestThetans = [];
		if (!thetans || thetans?.length === 0) {
			console.log('No thetans found.');
			return bestThetans;
		}
		if (thcPriceDollar === null || bnbPriceDollar === null) {
			console.log('Waiting for coin prices...');
			return bestThetans;
		}

		// Non sold
		// bestThetans = thetans.filter((hero) => hero.onMarketTime !== 0);
		// console.log('Thetans number (non sold): ' + thetans.length);

		// Listed 1h ago
		// bestThetans = thetans.filter((hero) => hero.onMarketTime > (new Date().getTime() - 36e5));
		// console.log('Thetans number (listed 1h ago): ' + thetans.length);

		// price higher than 50$ - because of bots
		// thetans = thetans.filter((hero) => (hero.price / 10e7) * bnbPriceDollar > 50);
		// console.log('Thetans number (higher than 50$): ' + thetans.length);

		// price lower than MY_FUNDS_DOLLAR
		thetans = thetans.filter((hero) => (hero.price / 10e7) * bnbPriceDollar < MY_FUNDS_DOLLAR);
		console.log(`Thetans number (less than ${MY_FUNDS_DOLLAR}$): ${thetans.length}`);

		// earn potential percentage higher than EARN_EXPECT_PERCENTAGE
		thetans = thetans.filter((hero) => {
			const earnPotential =
				hero.battleCap * thcPriceDollar * WIN_RATE * THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC[hero.heroRarity];
			const earnRate = (earnPotential * 10e7) / (hero.price * bnbPriceDollar) - 1;
			if (earnRate >= EARN_EXPECT_PERCENTAGE) {
				console.warn(
					`${hero.name} - EP: ${earnPotential.toFixed(2)}$; HP: ${(
						(hero.price * bnbPriceDollar) /
						10e7
					).toFixed(2)}$; ER: ${(earnRate * 100).toFixed(2)}%`
				);
			}
			return earnRate >= EARN_EXPECT_PERCENTAGE;
		});
		console.log('Thetans number (good earn potential): ' + thetans.length);
		return bestThetans;
	}

	function notify(n) {
		for (let i = 0; i < n; i++) {
			console.log('\007');
		}
	}

	const page = await openThetanMarketplace();
	setAsyncInterval(async () => {
		const thetans = await getThetans(page);
		const bestThetans = await getBestThetans(thetans);
		if (bestThetans.length > 0) {
			notify(bestThetans.length);
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

	[thcPriceDollar, bnbPriceDollar] = await getCoinsPrice();
	setAsyncInterval(async () => {
		[thcPriceDollar, bnbPriceDollar] = await getCoinsPrice();
	}, FETCH_COINS_INTERVAL);
}

try {
	main();
} catch (e) {
	console.error(e.message);
	process.exit(1);
}
