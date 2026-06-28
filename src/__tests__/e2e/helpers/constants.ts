export const TEST_REPO = "facebook/react";

export const uniqueEmail = (prefix = "e2e") =>
    `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}@example.com`;
