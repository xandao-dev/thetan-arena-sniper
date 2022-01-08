import { request, fetch, Client } from 'undici';
/*const { statusCode, body } = await request();
console.log('data', await body.json());*/

const { statusCode, body } = await request('https://exchange.thetanarena.com/exchange/v1/currency/price/11', {
	method: 'GET',
	headers: {
		Accept: 'application/json',
		'accept-language': 'en-US,en;q=0.9',
		'cache-control': 'max-age=0',
		'content-type': 'application/json',
		'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Linux"',
		'sec-fetch-dest': 'empty',
		'sec-fetch-mode': 'cors',
		'sec-fetch-site': 'same-site',
		Referer: 'https://marketplace.thetanarena.com/',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
	},
});

console.log('statusCode', statusCode);
const json = await body.json();
console.log('json', json);
console.log(json.success);
console.log(json.data.success);
console.log(json.data.nonce);
