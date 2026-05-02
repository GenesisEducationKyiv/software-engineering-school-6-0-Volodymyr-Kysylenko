const fs = require("node:fs");
const path = require("node:path");

const generatedDir = path.resolve(__dirname, "../src/grpc/generated");

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath);
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith(".ts")) {
            continue;
        }

        let content = fs.readFileSync(fullPath, "utf8");

        content = content.replace(/(from\s+["'])(\.{1,2}\/[^"']+?)(["'];?)/g, (_match, prefix, importPath, suffix) => {
            if (importPath.endsWith(".js") || importPath.endsWith(".json") || importPath.endsWith(".node")) {
                return `${prefix}${importPath}${suffix}`;
            }

            return `${prefix}${importPath}.js${suffix}`;
        });

        fs.writeFileSync(fullPath, content);
    }
}

walk(generatedDir);
