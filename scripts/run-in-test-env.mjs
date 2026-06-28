import { execSync } from "node:child_process";

const [, , testCommand, preCommand] = process.argv;

if (!testCommand) {
    console.error('Usage: node scripts/run-in-test-env.mjs "<testCommand>" ["<preCommand>"]');
    process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

try {
    run("pnpm run test:env:down");
} catch (e) {
    console.warn("test:env:down on startup failed (ignored):", e.message ?? e);
}

run("pnpm run test:env:up");

let failed = false;
try {
    if (preCommand) {
        try {
            run(preCommand);
        } catch (e) {
            console.error(`preCommand failed: ${preCommand}\n`, e.message ?? e);
            throw e;
        }
    }
    try {
        run(testCommand);
    } catch (e) {
        console.error(`testCommand failed: ${testCommand}\n`, e.message ?? e);
        throw e;
    }
} catch {
    failed = true;
} finally {
    run("pnpm run test:env:down");
}

process.exit(failed ? 1 : 0);
