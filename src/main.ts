import beeper from 'beeper';
import Web3 from 'web3';
import log from 'simple-node-logger';
import { cts, tradeCts, rentCts } from './configs.js';
import { urls } from './utils/urls.js';
import { Marketplace } from './Marketplace.js';
import { Wallet } from './Wallet.js';
import { WalletWatcher } from './WalletWatcher.js';
import { CoinWatcher } from './CoinWatcher.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

function setupLogger() {
	const logDirectory = './logs';
	if (!fs.existsSync(logDirectory)) {
		fs.mkdirSync(logDirectory);
	}

	const manager = log.createLogManager();
	manager.createConsoleAppender();
	manager.createRollingFileAppender({
		logDirectory,
		fileNamePattern: 'thetans-<DATE>.log',
		timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
	});
	const logger = manager.createLogger();
	return logger;
}

async function main() {
	const mode = cts.MODE;
	const earnExpectPercentage = cts.EARN_EXPECT_PERCENTAGE;
	const battleWinRate = cts.BATTLE_WIN_RATE;

	const web3 = new Web3(process.env.BSC_PROVIDER || 'https://bsc-dataseed1.binance.org:443');
	const wallet = new Wallet(web3);

	const walletWatcher = new WalletWatcher(wallet);
	await walletWatcher.start();

	const coinWatcher = new CoinWatcher();
	await coinWatcher.start();

	const marketplace = new Marketplace(web3, wallet, coinWatcher);
	await marketplace.connect();

	if (mode === 'rent') {
		await rentThetansRoutine(walletWatcher, coinWatcher, marketplace, earnExpectPercentage, battleWinRate);
	} else if (mode === 'trade') {
		await tradeThetansRoutine(walletWatcher, coinWatcher, marketplace, earnExpectPercentage, battleWinRate);
	} else if (mode === 'list-rent') {
		await rentThetansRoutine(walletWatcher, coinWatcher, marketplace, earnExpectPercentage, battleWinRate, true);
	} else if (mode === 'list-trade') {
		await tradeThetansRoutine(walletWatcher, coinWatcher, marketplace, earnExpectPercentage, battleWinRate, true);
	}
}

async function tradeThetansRoutine(
	walletWatcher: WalletWatcher,
	coinWatcher: CoinWatcher,
	marketplace: Marketplace,
	earnExpectPercentage: number,
	battleWinRate: number,
	listOnly: boolean = false
) {
	let lastGoodThetansIds: any[] = [];

	async function getBestThetans(thetans: any[]) {
		let bestThetans = thetans;
		if (!bestThetans || bestThetans?.length === 0) {
			console.log('Waiting for thetans...');
			return [];
		}
		if (!coinWatcher.coins.BNB || !coinWatcher.coins.THC) {
			console.log('Waiting for coin prices...');
			return [];
		}

		// *Min and Max price filter*
		bestThetans = bestThetans.filter(
			(hero) => hero.price / 1e8 >= tradeCts.MIN_THETAN_PRICE_THC && hero.price / 1e8 <= tradeCts.MAX_THETAN_PRICE_THC
		);
		console.log(`N. of thetans between ${tradeCts.MIN_THETAN_PRICE_THC} and ${tradeCts.MAX_THETAN_PRICE_THC} THC: ${bestThetans.length}`);

		// *Price lower than my THC balance*
		bestThetans = bestThetans.filter((hero) => hero.price / 1e8 < walletWatcher.balance.THC);
		console.log(`N. of thetans less than ${walletWatcher.balance.THC} THC): ${bestThetans.length}`);

		// *Remove unwanted thetans*
		bestThetans = bestThetans.filter((hero) => {
			if (tradeCts.THETAN_HERO_BLACKLIST.includes(hero.name)) {
				return false;
			}
			return hero;
		});
		console.log(`N. of thetans after blacklist: ${bestThetans.length}`);

		// *Earn potential percentage higher than earnExpectPercentage*
		bestThetans = bestThetans.filter((hero, index) => {
			const earnWhenWinning =
				hero.battleCap *
				coinWatcher.coins.THC *
				battleWinRate *
				cts.THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC[hero.heroRarity];
			const earnWhenLosing =
				hero.battleCap *
				coinWatcher.coins.THC *
				(1 - battleWinRate) *
				cts.THETAN_REWARDS_PER_BATTLE_THC.loss;

			const earnPotentialDollar = earnWhenWinning + earnWhenLosing;
			const earnRate = (earnPotentialDollar * 1e8) / (hero.price * coinWatcher.coins.THC) - 1;

			if (earnRate >= earnExpectPercentage) {
				bestThetans[index].earnPotentialDollar = earnPotentialDollar.toFixed(2);
				bestThetans[index].earnPotentialTHC = (earnPotentialDollar / coinWatcher.coins.THC).toFixed(0);
				bestThetans[index].earnRate = earnRate;
				bestThetans[index].heroPriceDollar = ((hero.price * coinWatcher.coins.THC) / 1e8).toFixed(2);
			}
			return earnRate >= earnExpectPercentage;
		});
		console.log(`N. of thetans with good earn potential: ${bestThetans.length}`);
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

	function orderThetansByEarnRate(bestThetans: any[]) {
		return bestThetans.sort((a, b) => b.earnRate - a.earnRate);
	}

	function logBestThetans(bestThetans: any[]) {
		bestThetans.forEach((thetan) => {
			logger.info(`Found nice ${thetan.name}(${thetan.id}):
	Current Time: ${new Date(Date.now()).toLocaleString()}
	Price: $${thetan.heroPriceDollar}; THC ${thetan.price / 1e8}
	Earn Potential: $${thetan.earnPotentialDollar}; THC ${thetan.earnPotentialTHC}
	Earn Rate: ${(thetan.earnRate * 100).toFixed(2)}%
	Link: ${urls.thetanPageLink(thetan.refId)}`);
		});
	}

	async function verifyBalances(thetan: any) {
		if (walletWatcher.balance.THC < thetan.price / 1e8 || walletWatcher.balance.THC < tradeCts.MIN_THETAN_PRICE_THC) {
			logger.warn('Not enough THC balance! Exiting...');
			beeper(1);
			return false;
		}
		if (walletWatcher.balance.BNB < tradeCts.MARKETPLACE_MAX_GAS_PRICE * tradeCts.MARKETPLACE_BUY_GAS * 1e-9) {
			logger.warn('Not enough BNB balance! Exiting...');
			beeper(1);
			return false;
		}
		return true;
	}

	async function buyThetan(thetan: any) {
		const result = await marketplace.buyThetan(
			thetan.id,
			thetan.tokenId,
			thetan.price,
			thetan.earnPotentialDollar,
			thetan.ownerAddress
		);
		if (result.success) {
			await beeper('*-*-*');
			logger.info(`
SUCCESSFULLY bought ${thetan.name}(${thetan.id}):
	Current Time: ${new Date(Date.now()).toLocaleString()}
	TX Hash: ${result?.tx?.transactionHash}
	Gas Used: ${result?.tx?.gasUsed}
	Gas Price: ${result?.tx?.gasPrice}
	Price: $${thetan.heroPriceDollar}; THC ${thetan.price / 1e8}
	Price Total (gas + price): THC${(thetan.price / 1e8 + (result.tx.gasUsed * result.gasPrice) / 1e9).toFixed(6)}
	Earn Potential: $${thetan.earnPotentialDollar}
	Earn Rate: ${(thetan.earnRate * 100).toFixed(2)}%
	Link: ${urls.thetanPageLink(thetan.refId)}`);
			await walletWatcher.update();
		} else {
			await beeper(1);
			logger.error(`
FAILED to buy ${thetan.name}(${thetan.id}):
	Error message: ${result.message}
	Current Time: ${new Date(Date.now()).toLocaleString()}
	TX Hash: ${result?.tx?.transactionHash}
	Gas Used: ${result?.tx?.gasUsed}
	Gas Price: ${result?.tx?.gasPrice}
	Price: $${thetan.heroPriceDollar}; THC ${thetan.price / 1e8}
	Earn Potential: $${thetan.earnPotentialDollar}; THC ${thetan.earnPotentialTHC}
	Earn Rate: ${(thetan.earnRate * 100).toFixed(2)}%
	Link: ${urls.thetanPageLink(thetan.refId)}`);
		}
	}

	let iterations = 0;
	while (true) {
		const thetans = await marketplace.getThetansFromMarket();
		let bestThetans = await getBestThetans(thetans);
		bestThetans = filterAlreadyListedThetans(bestThetans);
		bestThetans = orderThetansByEarnRate(bestThetans);

		if (bestThetans && bestThetans.length > 0) {
			// Ignore the first thetans, they maybe are already bought
			if (iterations < 5) {
				lastGoodThetansIds.push(...bestThetans.map((hero) => hero.id));
				continue;
			}

			logBestThetans(bestThetans);
			if (listOnly) {
				lastGoodThetansIds.push(...bestThetans.map((hero) => hero.id));
				continue;
			}

			const isBalanceValid = await verifyBalances(bestThetans[0]);
			if (!isBalanceValid) break;
			await buyThetan(bestThetans[0]);
			await walletWatcher.update();
			lastGoodThetansIds.push(...bestThetans.map((hero) => hero.id));
		}
		iterations++;
	}
	process.exit(0);
}

async function rentThetansRoutine(
	walletWatcher: WalletWatcher,
	coinWatcher: CoinWatcher,
	marketplace: Marketplace,
	earnExpectPercentage: number,
	battleWinRate: number,
	listOnly: boolean = false
) {
	let lastGoodThetansIds: any[] = [];

	async function getBestThetans(thetans: any[]) {
		let bestThetans = thetans;
		if (!bestThetans || bestThetans?.length === 0) {
			console.log('Waiting for thetans...');
			return [];
		}
		if (!coinWatcher.coins.BNB || !coinWatcher.coins.THC) {
			console.log('Waiting for coin prices...');
			return [];
		}

		// *Min and Max price filter*
		bestThetans = bestThetans.filter(
			(hero) =>
				hero.rentOutInfo.price.value / 1e8 >= rentCts.MIN_THETAN_PRICE_THC &&
				hero.rentOutInfo.price.value / 1e8 <= rentCts.MAX_THETAN_PRICE_THC
		);
		console.log('Thetans count (price min-max filter): ' + bestThetans.length);

		// *Price lower than my THC balance*
		bestThetans = bestThetans.filter((hero) => hero.rentOutInfo.price.value / 1e8 < walletWatcher.balance.THC);
		console.log(`Thetans count (less than ${walletWatcher.balance.THC} THC): ${bestThetans.length}`);

		// *Earn potential percentage higher than earnExpectPercentage*
		bestThetans = bestThetans.filter((hero, index) => {
			const earnWhenWinning =
				hero.rentOutInfo.rentBattles *
				coinWatcher.coins.THC *
				battleWinRate *
				(hero.rentOutInfo.thcBonus + cts.THETAN_REWARDS_PER_BATTLE_THC.win);
			const earnWhenLosing =
				hero.rentOutInfo.rentBattles *
				coinWatcher.coins.THC *
				(1 - battleWinRate) *
				cts.THETAN_REWARDS_PER_BATTLE_THC.loss;

			const earnPotentialDollar = earnWhenWinning + earnWhenLosing;
			const earnRate = (earnPotentialDollar * 1e8) / (hero.rentOutInfo.price.value * coinWatcher.coins.THC) - 1;

			/*console.log(
				`${hero.name}(${hero.id}): earnPotentialTHC: ${(earnPotentialDollar / coinWatcher.coins.THC).toFixed(
					2
				)} THC, earnRate: ${(earnRate * 100).toFixed(2)}%, price: ${(
					hero.rentOutInfo.price.value / 1e8
				).toFixed(2)} THC`
			);*/

			if (earnRate >= earnExpectPercentage) {
				bestThetans[index].earnPotentialDollar = earnPotentialDollar.toFixed(2);
				bestThetans[index].earnPotentialTHC = (earnPotentialDollar / coinWatcher.coins.THC).toFixed(0);
				bestThetans[index].earnRate = earnRate;
				bestThetans[index].heroPriceDollar = (
					(hero.rentOutInfo.price.value * coinWatcher.coins.THC) /
					1e8
				).toFixed(2);
			}
			return earnRate >= earnExpectPercentage;
		});
		console.log(`Thetans count (good earn potential): ${bestThetans.length}`);

		// *Remove unwanted thetans*
		bestThetans = bestThetans.filter((hero) => {
			if (rentCts.THETAN_HERO_BLACKLIST.includes(hero.name)) {
				return false;
			}
			return hero;
		});
		console.log(`Thetans count (removed blacklisted): ${bestThetans.length}`);

		// *Add some extra info to the thetans*
		bestThetans = bestThetans.map((hero) => {
			hero.daysToFinish = (
				hero.rentOutInfo.rentBattles / cts.THETAN_DAILY_BATTLES_LIMIT[hero.heroRarity]
			).toFixed(1);
			return hero;
		});

		return bestThetans;
	}

	function filterAlreadyListedThetans(bestThetans: any[]) {
		for (let i = 0; i < bestThetans.length; i++) {
			if (lastGoodThetansIds.includes(bestThetans[i].id)) {
				bestThetans.splice(i, 1);
				i--;
			}
		}
		console.log('Thetans count (filter repeated): ', bestThetans.length);
		return bestThetans;
	}

	function orderThetansByEarnRate(bestThetans: any[]) {
		return bestThetans.sort((a, b) => b.earnRate - a.earnRate);
	}

	function logBestThetans(bestThetans: any[]) {
		bestThetans.forEach((thetan) => {
			logger.info(`Found nice ${thetan.name}(${thetan.id}):
	Current Time: ${new Date(Date.now()).toLocaleString()}
	Price: $${thetan.heroPriceDollar}; THC ${thetan.rentOutInfo.price.value / 1e8}
	Earn Potential: $${thetan.earnPotentialDollar}; THC ${thetan.earnPotentialTHC}
	Earn Rate: ${(thetan.earnRate * 100).toFixed(2)}%
	Days to Finish: ${thetan.daysToFinish}d
	Link: ${urls.thetanPageLink(thetan.refId)}`);
		});
	}

	async function verifyBalances(thetan: any) {
		if (walletWatcher.balance.THC < thetan.rentOutInfo.price.value / 1e8) {
			logger.warn('Not enough THC balance! Exiting...');
			beeper(1);
			return false;
		}
		if (walletWatcher.balance.BNB < rentCts.MARKETPLACE_GAS_PRICE * rentCts.MARKETPLACE_BUY_GAS * 1e-9) {
			logger.warn(`Not enough BNB balance! Exiting...`);
			beeper(1);
			return false;
		}
		return true;
	}

	async function rentThetan(thetan: any) {
		const result = await marketplace.rentThetan(
			thetan.id,
			thetan.tokenId,
			thetan.rentOutInfo.price.value,
			thetan.ownerAddress
		);
		if (result.success) {
			await beeper('*-*-*');
			logger.info(`
SUCCESSFULLY rent ${thetan.name}(${thetan.id}):
	Current Time: ${new Date(Date.now()).toLocaleString()}
	TX Hash: ${result?.tx?.transactionHash}
	Gas Used: ${result?.tx?.gasUsed}
	Gas Price: ${result?.tx?.gasPrice}
	Price: $${thetan.heroPriceDollar}; THC ${thetan.rentOutInfo.price.value / 1e8}
	Price Total (gas + price): THC${(
					thetan.rentOutInfo.price.value / 1e8 +
					(result.tx.gasUsed * result.gasPrice) / 1e9
				).toFixed(6)}
	Earn Potential: $${thetan.earnPotentialDollar}; THC ${thetan.earnPotentialTHC}
	Earn Rate: ${(thetan.earnRate * 100).toFixed(2)}%
	Days to Finish: ${thetan.daysToFinish}d
	Link: ${urls.thetanPageLink(thetan.refId)}`);
			return true;
		} else {
			await beeper(1);
			logger.error(`
FAILED to rent ${thetan.name}(${thetan.id}):
	Error message: ${result.message}
	Current Time: ${new Date(Date.now()).toLocaleString()}
	TX Hash: ${result?.tx?.transactionHash}
	Gas Used: ${result?.tx?.gasUsed}
	Gas Price: ${result?.tx?.gasPrice}
	Price: $${thetan.heroPriceDollar}; THC ${thetan.rentOutInfo.price.value / 1e8}
	Earn Potential: $${thetan.earnPotentialDollar}; THC ${thetan.earnPotentialTHC}
	Earn Rate: ${(thetan.earnRate * 100).toFixed(2)}%
	Days to Finish: ${thetan.daysToFinish}d
	Link: ${urls.thetanPageLink(thetan.refId)}`);
			return false;
		}
	}

	let iterations = 0;
	while (true) {
		const thetans = await marketplace.getThetansFromRent();
		let bestThetans = await getBestThetans(thetans);
		bestThetans = filterAlreadyListedThetans(bestThetans);
		bestThetans = orderThetansByEarnRate(bestThetans);

		if (bestThetans && bestThetans.length > 0) {
			// Ignore the first thetans, they maybe are already rented
			if (iterations < 5) {
				lastGoodThetansIds.push(...bestThetans.map((hero) => hero.id));
				continue;
			}

			logBestThetans(bestThetans);
			if (listOnly) {
				lastGoodThetansIds.push(...bestThetans.map((hero) => hero.id));
				continue;
			}

			const isBalanceValid = await verifyBalances(bestThetans[0]);
			if (!isBalanceValid) break;
			const rented = await rentThetan(bestThetans[0]);
			if (rented) break;

			await walletWatcher.update();
			lastGoodThetansIds.push(...bestThetans.map((hero) => hero.id));
		}
		iterations++;
	}
	process.exit(0);
}

const logger = setupLogger();

(async () => {
	await main();
})();
