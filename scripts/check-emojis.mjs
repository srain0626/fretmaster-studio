import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const TARGET_DIRS = ['src', 'public/worklets', 'tests', 'scripts'];
const TARGET_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);

// Matches Unicode dingbats/misc symbols (U+2600..U+27BF), variation selector-16 (U+FE0F),
// and supplementary-plane pictographs/emojis via UTF-16 surrogate pairs.
const EMOJI_RE = /[\u2600-\u27BF\uFE0F]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g;

function collectFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (TARGET_EXTS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

const files = TARGET_DIRS.flatMap((rel) => collectFiles(path.join(repoRoot, rel)));
const violations = [];

for (const file of files) {
  const relPath = path.relative(repoRoot, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(EMOJI_RE);
    if (matches) {
      violations.push({
        file: relPath,
        line: i + 1,
        chars: matches.map((m) =>
          Array.from(m)
            .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase()}`)
            .join('+')
        ),
      });
    }
  }
}

if (violations.length > 0) {
  console.error(`Found ${violations.length} forbidden emoji/dingbat violation(s):`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> ${v.chars.join(', ')}`);
  }
  process.exit(1);
}

console.log(`Zero-emoji invariant verified across ${files.length} files.`);
