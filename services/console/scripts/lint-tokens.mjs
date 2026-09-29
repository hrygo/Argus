import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, "../src");

const ALLOWED_HEX_FILES = new Set([
  path.resolve(SRC_DIR, "design-system/tokens/colors.ts"),
  path.resolve(SRC_DIR, "design-system/tokens.css"),
]);

const IGNORED_DIRS = ["__tests__", "test"];

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        scanDir(fullPath, fileList);
      }
    } else if (/\.(tsx|ts|css)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

let hasError = false;
const files = scanDir(SRC_DIR);

// Match hex colors (e.g. #fff, #1a2b3c), but avoid HTML numeric entities like &#123;
const HEX_COLOR_REGEX = /(?<!&)#([0-9a-fA-F]{3,8})\b/g;
const ARBITRARY_TAILWIND_COLOR = /(?:bg|text|border|ring|outline)-\[#[0-9a-fA-F]{3,8}\]/g;

for (const file of files) {
  if (ALLOWED_HEX_FILES.has(file)) continue;

  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Check for hardcoded hex colors
    const hexMatches = line.match(HEX_COLOR_REGEX);
    if (hexMatches && !line.includes("// token-lint-ignore")) {
      console.error(
        `[Token Lint Error] Hardcoded hex color found in ${path.relative(SRC_DIR, file)}:${index + 1}`
      );
      console.error(`  Line: ${line.trim()}`);
      hasError = true;
    }

    // Check for arbitrary Tailwind color classes like bg-[#123456]
    const arbitraryMatches = line.match(ARBITRARY_TAILWIND_COLOR);
    if (arbitraryMatches && !line.includes("// token-lint-ignore")) {
      console.error(
        `[Token Lint Error] Arbitrary color class found in ${path.relative(SRC_DIR, file)}:${index + 1}`
      );
      console.error(`  Line: ${line.trim()}`);
      hasError = true;
    }
  });
}

if (hasError) {
  console.error("\n❌ Design Token Lint failed! Please use semantic tokens from the Argus Design System.");
  process.exit(1);
} else {
  console.log("✅ Design Token Lint: All files comply with Design System Tokens.");
}
