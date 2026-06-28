import type { LoggerPort } from "../../utils/logger/logger.types.js";
import type { EmailEventListenerPort } from "./email.types.js";

export class LoggerEmailEventListener implements EmailEventListenerPort {
    constructor(private readonly logger: Pick<LoggerPort, "info" | "warn" | "debug">) {}

    recordEmailSent(status: "success" | "error"): void {
        if (status === "success") {
            this.logger.info("Email delivered", { status });
        } else {
            this.logger.warn("Email delivery failed", { status });
        }
    }

    recordEmailDuration(type: "confirmation" | "release", durationSeconds: number): void {
        this.logger.debug("Email duration recorded", { type, durationSeconds });
    }
}
