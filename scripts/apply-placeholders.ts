/**
 * Idempotent placeholder/marker pass run by scripts/sync-template.sh after the
 * copy. The generator (src/generate.ts) consumes the same markers at scaffold
 * time to filter apps/themes and to substitute {{name}} / {{title}} /
 * {{pagesProject}}.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('usage: apply-placeholders.ts <template-dir>');
  process.exit(1);
}

function read(rel: string): string {
  return readFileSync(join(target, rel), 'utf8');
}
function write(rel: string, content: string): void {
  writeFileSync(join(target, rel), content);
}

// --- config.ts: app import block markers -------------------------------
{
  const rel = 'src/config.ts';
  let s = read(rel);
  const importRe = /^import \{ [^}]+ \} from '\.\/apps\/[a-z]+';$/gm;
  const imports = [...s.matchAll(importRe)];
  if (imports.length === 0) {
    console.error('config.ts: no app import lines found');
    process.exit(1);
  }
  // Strip any previous marker block, then re-emit.
  s = s.replace(/^\/\/ @apps-start\n[\s\S]*?^\/\/ @apps-end\n/gm, '');
  const start = imports[0].index;
  const end = imports.at(-1)!.index + imports.at(-1)![0].length + 1;
  const block = s.slice(start, end);
  s = s.slice(0, start) + `// @apps-start\n${block}// @apps-end\n` + s.slice(end);

  // Apps array: markers on their own lines inside `const apps = [ ... ];`
  // (strip both the own-line form and the legacy trailing form first)
  s = s.replace(/^\/\/ @apps-list-start\n/gm, '');
  s = s.replace(/[ \t]*\/\/ @apps-list-end/gm, '');
  s = s.replace(/^(\s*const apps = \[\n)([\s\S]*?)(\n\s*\];)/m, (_m, pre, body, post) => {
    return `${pre}// @apps-list-start\n${body}\n// @apps-list-end${post}`;
  });
  if (!s.includes('// @apps-list-start')) {
    console.error('config.ts: apps array marker injection failed');
    process.exit(1);
  }
  write(rel, s);
}

// --- icons.ts: DESKTOP_ICON_SPECS markers -------------------------------
{
  const rel = 'src/desktop/icons.ts';
  let s = read(rel);
  s = s.replace(
    /^(export const DESKTOP_ICON_SPECS[^\n]* = \[\n)([\s\S]*?)(^];)/m,
    (_m, pre, body, post) => `${pre}// @icons-start\n${body}// @icons-end\n${post}`,
  );
  if (!s.includes('// @icons-start')) {
    console.error('icons.ts: specs marker injection failed');
    process.exit(1);
  }
  write(rel, s);
}

// --- main.ts: seed-window markers ---------------------------------------
{
  const rel = 'src/desktop/main.ts';
  let s = read(rel);
  const openRe =
    /^  (const \w+: DesktopWindow \| null = shell\.open\('[a-z]+'\);|if \(\w+\) \w+\.setGeometry\([^)]+\);)$/gm;
  const lines = [...s.matchAll(openRe)];
  if (lines.length === 0) {
    console.error('main.ts: seed window lines not found');
    process.exit(1);
  }
  s = s.replace(/^  \/\/ @seed-start\n|^  \/\/ @seed-end\n/gm, '');
  const start = lines[0].index;
  const end = lines.at(-1)!.index + lines.at(-1)![0].length + 1;
  s = s.slice(0, start) + `  // @seed-start\n${s.slice(start, end)}  // @seed-end\n` + s.slice(end);
  write(rel, s);
}

// --- deploy-pages.sh is project-name-agnostic (arg-driven); the project
// name placeholder lives in template-owned/package.json's deploy script.

// --- index.html: title placeholder --------------------------------------
{
  const rel = 'index.html';
  const s = read(rel).replace(/<title>[^<]*<\/title>/, '<title>{{title}}</title>');
  write(rel, s);
}

console.log('placeholders applied');
