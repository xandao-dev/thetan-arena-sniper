const tradeCts = {
	// GAS
	MARKETPLACE_BUY_GAS: 240000,
	MARKETPLACE_MAX_GAS_PRICE: 200, //100 -> 0.03BNB (15$ if BNB = 500$) //130 -> 0.04 BNB (20$ if BNB = 500$)
	MARKETPLACE_MIN_GAS_PRICE: 8,
	MARKETPLACE_PROFIT_TO_GAS_RATIO: 0.75, // 75% of the profit could be used as gas

	// HERO
	MIN_THETAN_PRICE_THC: 0,
	MAX_THETAN_PRICE_THC: 1500,
	FILTER_THETAN_HERO_RARITIES: [1, 2], // 0: common, 1: epic, 2: legendary
	THETAN_HERO_MIN_BATTLES: 0,
	THETAN_HERO_MAX_BATTLES: 9999,
	THETAN_HERO_BLACKLIST: ['Veinka', 'Raidon', 'Bathos', 'Morrod'],
};

const rentCts = {
	// GAS
	MARKETPLACE_BUY_GAS: 240000,
	MARKETPLACE_GAS_PRICE: 10, //100 -> 0.03BNB (15$ if BNB = 500$) //130 -> 0.04 BNB (20$ if BNB = 500$)

	// HERO
	MIN_THETAN_PRICE_THC: 0,
	MAX_THETAN_PRICE_THC: 1500,
	FILTER_THETAN_HERO_RARITIES: [1, 2], // 0: common, 1: epic, 2: legendary
	THETAN_HERO_MIN_BATTLES: 50,
	THETAN_HERO_MAX_BATTLES: 250,
	THETAN_HERO_BLACKLIST: ['Veinka', 'Raidon', 'Bathos', 'Morrod'],
};

const cts = {
	// INITIALIZATION
	MODE: 'trade', // trade, list-trade, rent, list-rent
	EARN_EXPECT_PERCENTAGE: 0.5, // 0.5 = 50% profit over battle win rate
	BATTLE_WIN_RATE: 0.5, // 0.5 = 50% win rate

	// DO NOT CHANGE
	WRAP_BNB_GAS: 50000,
	WRAP_BNB_GAS_PRICE: 10,
	UNWRAP_BNB_GAS: 50000,
	UNWRAP_BNB_GAS_PRICE: 10,
	FETCH_COINS_INTERVAL: 60 * 1000,
	FETCH_BALANCE_INTERVAL: 60 * 1000,
	MARKETPLACE_LOGIN_INTERVAL: 60 * 60 * 1000, // 1 hour
	MARKETPLACE_SELL_FEE: 0.0415, //4.15%
	THETAN_RARITY_WIN_REWARDS_PER_BATTLE_THC: [9.25, 12.5, 29.55], // hero bonus at lv1 + battle reward
	THETAN_REWARDS_PER_BATTLE_THC: {
		win: 6,
		tie: 2,
		loss: 1,
	},
	THETAN_HERO_RARITIES: [0, 1, 2], // 0: common, 1: epic, 2: legendary
	THETAN_DAILY_BATTLES_LIMIT: [8, 10, 12], // 0: common, 1: epic, 2: legendary
}

export { tradeCts, rentCts, cts };
