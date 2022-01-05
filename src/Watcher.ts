import { setIntervalAsync } from 'set-interval-async/dynamic/index.js';
import { clearIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async';

abstract class Watcher {
	private fetchInterval: number;
	private started: boolean = false;
	private intervalTimer?: SetIntervalAsyncTimer;
	constructor(fetchIntervalMs: number) {
		this.fetchInterval = fetchIntervalMs;
	}

	protected abstract fetchData(): Promise<void>;

	public async start(): Promise<void> {
		if (this.started) {
			return;
		}
		this.started = true;

		await this.fetchData();
		this.intervalTimer = setIntervalAsync(async () => {
			await this.fetchData();
		}, this.fetchInterval);
	}

	public async stop(): Promise<void> {
		if (this.intervalTimer) {
			await clearIntervalAsync(this.intervalTimer);
		}
		this.started = false;
	}
}

export { Watcher };
