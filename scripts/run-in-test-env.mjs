import { execSync } from "node:child_process";

const [, , testCommand, preCommand] = process.argv;

if (!testCommand) {
    console.error('Usage: node scripts/run-in-test-env.mjs "<testCommand>" ["<preCommand>"]');
    process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

try {
    run("pnpm run test:env:down");
} catch {}

run("pnpm run test:env:up");

let failed = false;
try {
    if (preCommand) {
        run(preCommand);
    }
    run(testCommand);
} catch {
    failed = true;
} finally {
    run("pnpm run test:env:down");
}

process.exit(failed ? 1 : 0);
