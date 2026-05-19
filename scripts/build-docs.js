// Generate static OpenAPI spec từ src/config/swagger.js
// Output: docs/openapi.json
// Dùng bởi GitHub Actions để deploy Pages

const fs = require("fs");
const path = require("path");

// Set tối thiểu env vars để swagger.js (require qua chain) không crash
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "build_only";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "build_only_2";
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://placeholder/build";

const swaggerSpec = require("../src/config/swagger");

const outDir = path.join(__dirname, "..", "docs");
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, "openapi.json");
fs.writeFileSync(outFile, JSON.stringify(swaggerSpec, null, 2));

const paths = Object.keys(swaggerSpec.paths);
console.log(`✓ Wrote ${outFile}`);
console.log(`  Endpoints: ${paths.length}`);
console.log(
  `  Schemas:   ${Object.keys(swaggerSpec.components.schemas).length}`
);
