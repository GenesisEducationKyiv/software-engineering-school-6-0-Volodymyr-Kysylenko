import type { LoggerPort } from "../utils/logger/logger.types.js";

export interface ScannerPort {
    scanOnce(): Promise<void>;
}

export interface ScannerRunner {
    start(): void;
    stop(): void;
}

export interface ScannerRunnerDependencies {
    scanner: ScannerPort;
    logger: LoggerPort;
    intervalMs: number;
}

export function createScannerRunner(deps: ScannerRunnerDependencies): ScannerRunner {
    const { scanner, logger, intervalMs } = deps;

    let interval: NodeJS.Timeout | null = null;
    let runningTask: Promise<void> | null = null;

    async function executeRun(label: string): Promise<void> {
        try {
            await scanner.scanOnce();
            logger.info(`${label} scanner run completed`);
        } catch (error: unknown) {
            logger.error(`${label} scanner run failed`, error);
        }
    }

    function runOnce(label: string): void {
        if (runningTask) {
            logger.warn("Scanner iteration skipped because previous iteration is still running");
            return;
        }

        runningTask = executeRun(label).finally(() => {
            runningTask = null;
        });
    }

    return {
        start(): void {
            runOnce("Initial");

            interval = setInterval(() => {
                runOnce("Scheduled");
            }, intervalMs);
        },

        stop(): void {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        },
    };
}
