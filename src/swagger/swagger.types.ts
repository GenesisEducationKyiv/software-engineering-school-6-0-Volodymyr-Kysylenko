import type { JsonObject } from "swagger-ui-express";

export type SwaggerDocument = JsonObject & {
    host?: string;
    schemes?: string[];
};
