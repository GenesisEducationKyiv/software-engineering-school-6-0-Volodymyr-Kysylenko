import { z } from "zod";

import { AppError } from "./errors.js";

const emailSchema = z.string().email();
const repoSchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Invalid repo format");

export function validateEmail(email: string): string {
    try {
        return emailSchema.parse(email.trim().toLowerCase());
    } catch {
        throw AppError.validation("Invalid email");
    }
}

export function parseRepo(input: string): { owner: string; repo: string; fullName: string } {
    const normalized = input.trim();

    if (!repoSchema.safeParse(normalized).success) {
        throw AppError.validation("Invalid repo format. Expected owner/repo");
    }

    const [owner, repo] = normalized.split("/");
    return { owner, repo, fullName: `${owner}/${repo}` };
}
