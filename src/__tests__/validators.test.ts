import { describe, expect, it } from "vitest";
import { AppError } from "../utils/errors.js";
import { parseRepo, validateEmail } from "../utils/validators.js";

describe("validators", () => {
    it("parses valid owner/repo format", () => {
        expect(parseRepo("golang/go")).toEqual({
            owner: "golang",
            repo: "go",
            fullName: "golang/go",
        });
    });

    it("throws 400 for invalid repo format", () => {
        expect(() => parseRepo("invalid-format")).toThrowError(AppError);
    });

    it("normalizes and validates email", () => {
        expect(validateEmail(" USER@Example.com ")).toBe("user@example.com");
    });

    it("throws 400 for invalid email", () => {
        expect(() => validateEmail("not-an-email")).toThrowError(AppError);
    });
});
