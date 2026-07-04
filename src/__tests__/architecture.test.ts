import { cruise, type IFlattenedRuleSet } from "dependency-cruiser";
import { describe, expect, it } from "vitest";

const ruleSet: IFlattenedRuleSet = {
    forbidden: [
        {
            name: "no-circular",
            severity: "error",
            comment: "circular imports make module boundaries meaningless",
            from: {},
            to: { circular: true },
        },
        {
            name: "layering-skip-services",
            severity: "error",
            comment: "routes/controllers must go through services, not repositories/db directly",
            from: { path: "^src/(routes|controllers)/" },
            to: { path: "^src/(repositories|db)/" },
        },
        {
            name: "services-framework-agnostic",
            severity: "error",
            comment: "business logic must stay framework-agnostic, no runtime express dependency",
            from: { path: "^src/services/" },
            to: { path: "node_modules/express/", dependencyTypesNot: ["type-only"] },
        },
        {
            name: "db-access-confined",
            severity: "error",
            comment: "only src/db may hold a runtime dependency on pg; elsewhere it's types only",
            from: { pathNot: "^src/db/" },
            to: { path: "node_modules/pg/", dependencyTypesNot: ["type-only"] },
        },
        {
            name: "monolith-no-notification-import",
            severity: "error",
            comment: "monolith and notification-service may only talk through broker-contracts",
            from: { path: "^src/" },
            to: { path: "^apps/notification-service/src/" },
        },
        {
            name: "notification-no-monolith-import",
            severity: "error",
            comment: "monolith and notification-service may only talk through broker-contracts",
            from: { path: "^apps/notification-service/src/" },
            to: { path: "^src/" },
        },
        {
            name: "broker-contracts-is-a-leaf",
            severity: "error",
            comment: "the shared contracts package must not depend back on either service",
            from: { path: "^packages/broker-contracts/src/" },
            to: { path: "^(src|apps/notification-service/src)/" },
        },
        {
            name: "no-orphans",
            severity: "warn",
            comment: "unreferenced module - wire it up or delete it",
            from: { orphan: true },
            to: {},
        },
    ],
};

describe("architecture dependency rules", () => {
    it("respects layering and package boundaries", async () => {
        const result = await cruise(
            ["src", "apps/notification-service/src", "packages/broker-contracts/src"],
            {
                outputType: "json",
                validate: true,
                ruleSet,
                doNotFollow: { path: "node_modules" },
                exclude: { path: "(^|/)__tests__/" },
                tsPreCompilationDeps: true,
            },
            undefined,
            { tsConfig: { fileName: "tsconfig.base.json" } },
        );

        const output = typeof result.output === "string" ? JSON.parse(result.output) : result.output;
        const errors = output.summary.violations.filter(
            (v: { rule: { severity: string } }) => v.rule.severity === "error",
        );

        expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
    });
});
