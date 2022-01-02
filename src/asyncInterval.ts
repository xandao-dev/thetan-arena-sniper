const asyncIntervals: boolean[] = [];
const runAsyncInterval = async (cb: Function, interval: number, intervalIndex: number) => {
	await cb();
	if (asyncIntervals[intervalIndex]) {
		setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
	}
};

const setAsyncInterval = (cb: Function, interval: number) => {
	if (cb && typeof cb === 'function') {
		const intervalIndex = asyncIntervals.length;
		asyncIntervals.push(true);
		runAsyncInterval(cb, interval, intervalIndex);
		return intervalIndex;
	} else {
		throw new Error('Callback must be a function');
	}
};

const clearAsyncInterval = (intervalIndex: number) => {
	if (asyncIntervals[intervalIndex]) {
		asyncIntervals[intervalIndex] = false;
	}
};

export { setAsyncInterval, clearAsyncInterval };
