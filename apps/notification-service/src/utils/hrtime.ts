export function elapsedSeconds(startNs: bigint): number {
    return Number(process.hrtime.bigint() - startNs) / 1e9;
}
