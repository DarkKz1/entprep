const fs = require("fs");
const path = require("path");
const outPath = path.resolve(process.env.USERPROFILE, "OneDrive/Documents/Ent_prep/entprep-app/scripts/test-quality.mjs");

// Build the script content
const DQ = String.fromCharCode(34);
const lines = [];

function L(s) { lines.push(s); }
function DQL(s) { lines.push(s.replace(/Q/g, DQ)); }

L("// Test Quality Script: validates all 13 question files");
L("// Usage: node scripts/test-quality.mjs");
L("");
DQL("import { fileURLToPath, pathToFileURL } from QurlQ;");
DQL("import { dirname, join } from QpathQ;");
L("");
L("const __dirname = dirname(fileURLToPath(import.meta.url));");
DQL("const srcDir = join(__dirname, Q..Q, QsrcQ);");
L("const toURL = (p) => pathToFileURL(p).href;");
L("");