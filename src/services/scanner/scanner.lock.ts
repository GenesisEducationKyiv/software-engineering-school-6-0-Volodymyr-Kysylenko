import type { ScannerLockPort } from "./scanner.types.js";

export class InMemoryScannerLock implements ScannerLockPort {
    private isLocked = false;

    acquire(): boolean {
        if (this.isLocked) {
            return false;
        }

        this.isLocked = true;
        return true;
    }

    release(): void {
        this.isLocked = false;
    }
}
