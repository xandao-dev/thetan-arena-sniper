import { rentCts, tradeCts } from '../configs.js';

const urls = {
	MARKETPLACE: 'https://marketplace.thetanarena.com/',
	LOGIN_TO_MARKETPLACE: 'https://data.thetanarena.com/thetan/v1/authentication/token',
	GET_THC_PRICE: 'https://exchange.thetanarena.com/exchange/v1/currency/price/11',
	GET_BNB_PRICE: 'https://exchange.thetanarena.com/exchange/v1/currency/price/32',
	getTradeThetans: () => {
		const heroRarity = tradeCts.FILTER_THETAN_HERO_RARITIES.reduce((p: string | number, c: string | number) => p.toString() + '%2C' + c.toString(), '');
		return `https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&heroRarity=${heroRarity}&battleMax=${tradeCts.THETAN_HERO_MAX_BATTLES}&battleMin=${tradeCts.THETAN_HERO_MIN_BATTLES}&batPercentMin=0&batPercentMax=100&from=0&size=5`;
	},
	getRentThetans: () => {
		const heroRarity = rentCts.FILTER_THETAN_HERO_RARITIES.reduce((p: string | number, c: string | number) => p.toString() + '%2C' + c.toString(), '');
		return `https://data.thetanarena.com/thetan/v1/nif/search?sort=Latest&heroRarity=${heroRarity}&rentBattleMin=${rentCts.THETAN_HERO_MIN_BATTLES}&rentBattleMax=${rentCts.THETAN_HERO_MAX_BATTLES}&from=0&size=5&type=30`;
	},
	thetanPageLink: (refId: string) => `https://marketplace.thetanarena.com/item/${refId}`,
	getLoginNonce: (walletAddress: string) => `https://data.thetanarena.com/thetan/v1/authentication/nonce?Address=${walletAddress}`,
	getThetanSaltNonce: (thetanId: string) => `https://data.thetanarena.com/thetan/v1/items/${thetanId}?id=${thetanId}`,
	getSellerSignature: (thetanId: string) => `https://data.thetanarena.com/thetan/v1/items/${thetanId}/signed-signature?id=${thetanId}`,
	getRenterSignature: (thetanId: string) => `https://data.thetanarena.com/thetan/v1/nft-items/${thetanId}/rent-out-signature?id=${thetanId}`,
};

export { urls };
