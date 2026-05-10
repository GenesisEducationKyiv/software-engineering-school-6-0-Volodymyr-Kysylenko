import fs from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type { SwaggerDocument } from "./swagger.types.js";

export function loadSwaggerDocument(appBaseUrl: string): SwaggerDocument {
    const swaggerPath = path.resolve(process.cwd(), "src", "swagger", "swagger.yaml");
    const swaggerFileContent = fs.readFileSync(swaggerPath, "utf8");

    const swaggerDocument = YAML.parse(swaggerFileContent) as SwaggerDocument;

    const baseUrl = new URL(appBaseUrl);

    swaggerDocument.host = baseUrl.host;
    swaggerDocument.schemes = [baseUrl.protocol.slice(0, -1)];

    return swaggerDocument;
}
