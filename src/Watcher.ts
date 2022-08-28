import { setIntervalAsync } from 'set-interval-async/dynamic/index.js';
import { clearIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async';

abstract class Watcher {
	private fetchInterval: number;
	private started: boolean = false;
	private intervalTimer?: SetIntervalAsyncTimer<unknown[]>;
	constructor(fetchIntervalMs: number) {
		this.fetchInterval = fetchIntervalMs;
	}

	protected abstract fetchData(): Promise<void>;

	public async update(): Promise<void> {
		try {
			await this.fetchData();
		} catch (e: any) {
			throw new Error(`Failed to fetch data: ${e.message}`);
		}
	}

	public async start(): Promise<void> {
		if (this.started) {
			return;
		}
		this.started = true;

		try {
			await this.fetchData();
			this.intervalTimer = setIntervalAsync(async () => {
				await this.fetchData();
			}, this.fetchInterval);
		} catch (e: any) {
			throw new Error(`Failed to start watcher: ${e.message}`);
		}
	}

	public async stop(): Promise<void> {
		if (this.intervalTimer) {
			await clearIntervalAsync(this.intervalTimer);
		}
		this.started = false;
	}
}

export { Watcher };
