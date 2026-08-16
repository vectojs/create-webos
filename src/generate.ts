/**
 * Scaffold generation — pure logic, testable without a terminal.
 * Copies the embedded template, substitutes placeholders, filters the
 * marker sections (apps, icons, seed windows), and optionally installs.
 */

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export interface ScaffoldOptions {
  /** npm package name for the generated package.json. */
  name: string;
  /** index.html <title> and README H1. */
  title: string;
  /** Selected app ids (a subset of the template's apps, min 2). */
  apps: string[];
  /** Theme preset id (aero, breeze, aqua, cloud, y2k, vaporwave, dreamcore). */
  theme: string;
  /** Include the Cloudflare Pages CI workflow. */
  ci: boolean;
  /** Cloudflare Pages project name (used only when ci is true). */
  pagesProject: string;
  /** Target directory. */
  dir: string;
  /** Skip `bun install` after generation. */
  skipInstall: boolean;
}

export const APP_NAME_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

const SEED_GEOMETRY: ReadonlyArray<readonly [number, number, number, number]> = [
  [200, 36, 540, 380],
  [560, 80, 520, 470],
];

function templateRoot(): string {
  // dist/generate.js → <pkg>/dist/..; src/generate.ts (bun test) → <pkg>/src/..
  const candidates = [
    resolve(import.meta.dirname, '../template'),
    resolve(import.meta.dirname, '../../template'),
  ];
  const found = candidates.find((c) => existsSync(join(c, 'package.json')));
  if (!found) throw new Error('template directory not found relative to the generator');
  return found;
}

/** App ids present in the template, in template order. */
export function templateAppIds(): string[] {
  const config = readFileSync(join(templateRoot(), 'src/config.ts'), 'utf8');
  const ids: string[] = [];
  for (const m of config.matchAll(/^import \{ [^}]+ \} from '\.\/apps\/([a-z-]+)';/gm)) {
    ids.push(m[1]);
  }
  return ids;
}

export function themeIds(): string[] {
  return ['aero', 'breeze', 'aqua', 'cloud', 'y2k', 'vaporwave', 'dreamcore'];
}

function substitute(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

/** Rebuild the @apps-start/…/@apps-end import block, keeping selected apps. */
function filterAppImports(content: string, apps: string[]): string {
  const keep = new Set(apps);
  return content.replace(
    /^\/\/ @apps-start\n([\s\S]*?)^\/\/ @apps-end\n/gm,
    (_m, block: string) => {
      const kept: string[] = [];
      for (const line of block.split('\n')) {
        const m = line.match(/^import \{ [^}]+ \} from '\.\/apps\/([a-z-]+)';$/);
        if (m && keep.has(m[1])) kept.push(line);
      }
      return `// @apps-start\n${kept.join('\n')}\n// @apps-end\n`;
    },
  );
}

/** binding name → app id, read from the template's import table. */
function bindingToAppId(): Map<string, string> {
  const config = readFileSync(join(templateRoot(), 'src/config.ts'), 'utf8');
  const map = new Map<string, string>();
  for (const m of config.matchAll(
    /^import \{ (\w+)(?:, (\w+))? \} from '\.\/apps\/([a-z-]+)';/gm,
  )) {
    map.set(m[1], m[3]);
    if (m[2]) map.set(m[2], m[3]);
  }
  return map;
}

/** Split an array body into top-level entries (paren/brace aware). */
function splitEntries(body: string): string[] {
  const entries: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '(' || ch === '{') depth++;
    else if (ch === ')' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      entries.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  const rest = current.trim();
  if (rest !== '') entries.push(rest);
  return entries.map((e) => e.trim());
}

/** Rebuild the @apps-list block: keep identifiers whose import survived. */
function filterAppList(content: string, apps: string[]): string {
  const keep = new Set(apps);
  const bindingIds = bindingToAppId();
  return content.replace(
    /^(\s*)const apps = \[\n\/\/ @apps-list-start\n([\s\S]*?)^(\s*)\/\/ @apps-list-end/ms,
    (_m, indent: string, block: string, _tailIndent: string) => {
      const kept: string[] = [];
      for (const entry of splitEntries(block)) {
        const m = entry.match(/^(\w+)/);
        if (m && keep.has(bindingIds.get(m[1]) ?? '')) {
          kept.push(`    ${entry},`);
        }
      }
      return `${indent}const apps = [\n    // @apps-list-start\n${kept.join('\n')}\n    // @apps-list-end`;
    },
  );
}

function filterConfig(content: string, apps: string[], theme: string): string {
  let out = filterAppImports(content, apps);
  out = out.replace(
    /^import \{ \w+Preset \} from '\.\/model\/theme-[a-z]+';$/m,
    `import { ${theme}Preset } from './model/theme-${theme}';`,
  );
  out = out.replace(
    /^export const DEFAULT_PRESET = \w+Preset;$/m,
    `export const DEFAULT_PRESET = ${theme}Preset;`,
  );
  return filterAppList(out, apps);
}

function filterIcons(content: string, apps: string[]): string {
  const keep = new Set(apps);
  return content.replace(
    /^\/\/ @icons-start\n([\s\S]*?)^\/\/ @icons-end$/m,
    (_m, block: string) => {
      const kept: string[] = [];
      for (const line of block.split('\n')) {
        const m = line.match(/^\s*\{ id: '[^']+', appId: '([a-z-]+)', label: '[^']+' \},?$/);
        if (m && keep.has(m[1])) kept.push(line);
      }
      return `  // @icons-start\n${kept.join('\n')}\n  // @icons-end`;
    },
  );
}

function filterSeed(content: string, apps: string[]): string {
  const picks = apps.slice(0, SEED_GEOMETRY.length);
  const lines: string[] = [];
  picks.forEach((appId, i) => {
    const [x, y, w, h] = SEED_GEOMETRY[i];
    lines.push(
      `  const seedWin${i}: DesktopWindow | null = shell.open('${appId}');`,
      `  if (seedWin${i}) seedWin${i}.setGeometry(${x}, ${y}, ${w}, ${h});`,
    );
  });
  return content.replace(/^  \/\/ @seed-start\n[\s\S]*?^  \/\/ @seed-end$/m, () =>
    lines.length > 0
      ? `  // @seed-start\n${lines.join('\n')}\n  // @seed-end`
      : '  // @seed-start\n  // @seed-end',
  );
}

export interface ScaffoldResult {
  dir: string;
  skipped: string[];
}

export function scaffold(options: ScaffoldOptions): ScaffoldResult {
  if (!APP_NAME_RE.test(options.name)) {
    throw new Error(`invalid package name: ${options.name}`);
  }
  if (options.apps.length < 2) {
    throw new Error('at least two apps are required (the boot smoke asserts >= 2 windows)');
  }
  if (!themeIds().includes(options.theme)) {
    throw new Error(`unknown theme: ${options.theme}`);
  }

  const src = templateRoot();
  const dir = resolve(options.dir);
  if (existsSync(dir)) {
    throw new Error(`target directory already exists: ${dir}`);
  }

  cpSync(src, dir, { recursive: true });

  const vars = {
    name: options.name,
    title: options.title,
    pagesProject: options.pagesProject || options.name,
  };
  const touched: Array<[string, string]> = [
    ['package.json', substitute(readFileSync(join(dir, 'package.json'), 'utf8'), vars)],
    ['index.html', substitute(readFileSync(join(dir, 'index.html'), 'utf8'), vars)],
    ['README.md', substitute(readFileSync(join(dir, 'README.md'), 'utf8'), vars)],
    [
      'src/config.ts',
      filterConfig(readFileSync(join(dir, 'src/config.ts'), 'utf8'), options.apps, options.theme),
    ],
    [
      'src/desktop/icons.ts',
      filterIcons(readFileSync(join(dir, 'src/desktop/icons.ts'), 'utf8'), options.apps),
    ],
    [
      'src/desktop/main.ts',
      filterSeed(readFileSync(join(dir, 'src/desktop/main.ts'), 'utf8'), options.apps),
    ],
  ];
  for (const [rel, content] of touched) {
    writeFileSync(join(dir, rel), content);
  }

  const skipped: string[] = [];
  if (options.ci) {
    const ci = join(dir, '.github/workflows/ci.yml');
    writeFileSync(ci, substitute(readFileSync(ci, 'utf8'), vars));
  } else {
    rmSync(join(dir, '.github/workflows/ci.yml'));
    rmSync(join(dir, '.github/workflows'), { recursive: true, force: true });
    skipped.push('CI workflow (--no-ci)');
  }

  if (!options.skipInstall) {
    // `prepare` (lefthook install) needs a git repo, so init one first.
    spawnSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    const install = spawnSync('bun', ['install'], {
      cwd: dir,
      stdio: 'inherit',
    });
    if (install.status !== 0) {
      throw new Error('bun install failed; run it manually inside the generated directory');
    }
  }

  return { dir, skipped };
}

export function generatedSummary(result: ScaffoldResult, name: string): string {
  const cd = basename(result.dir);
  const lines = [
    `Created ${name} in ${result.dir}`,
    ...result.skipped.map((s) => `Skipped: ${s}`),
    '',
    'Next steps:',
    `  cd ${cd}`,
    '  bun run dev          # local dev server',
    '  # open http://localhost:5173/?debug for the VMT inspector',
  ];
  return lines.join('\n');
}
