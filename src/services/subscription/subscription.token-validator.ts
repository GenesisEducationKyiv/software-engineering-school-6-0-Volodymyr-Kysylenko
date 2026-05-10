import { AppError } from "../../utils/errors.js";

export class SubscriptionTokenValidator {
    private static readonly TOKEN_PATTERN = /^[0-9a-f]{48}$/;

    validate(token: string): void {
        if (!token.trim()) {
            throw AppError.validation("Invalid token");
        }

        if (!SubscriptionTokenValidator.TOKEN_PATTERN.test(token)) {
            throw AppError.validation("Invalid token format");
        }
    }
}
