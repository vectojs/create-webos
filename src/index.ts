#!/usr/bin/env node
/**
 * create-webos — scaffold a VectoJS desktop website.
 * Interactive by default; fully scriptable with flags (see --help).
 */

import { APP_NAME_RE, scaffold, generatedSummary, templateAppIds, themeIds } from './generate.js';
import { askConfirm, askMulti, askSelect, askText } from './prompts.js';

interface Args {
  yes: boolean;
  name?: string;
  apps?: string[];
  theme?: string;
  ci: boolean;
  pagesProject?: string;
  dir?: string;
  skipInstall: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    yes: false,
    ci: true,
    skipInstall: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--yes':
      case '-y':
        args.yes = true;
        break;
      case '--name':
        args.name = argv[++i];
        break;
      case '--apps': {
        const v = argv[++i];
        args.apps = v === 'all' ? undefined : v.split(',').map((s) => s.trim());
        break;
      }
      case '--theme':
        args.theme = argv[++i];
        break;
      case '--no-ci':
        args.ci = false;
        break;
      case '--pages-project':
        args.pagesProject = argv[++i];
        break;
      case '--dir':
        args.dir = argv[++i];
        break;
      case '--skip-install':
        args.skipInstall = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${a}`);
    }
  }
  return args;
}

function help(): string {
  return `create-webos — scaffold a VectoJS desktop website

Usage:
  bun create webos [options]

Options:
  --yes, -y              use defaults, skip prompts
  --name <pkg>           npm package name (default: webos-app)
  --apps <a,b,c|all>     app subset, min 2 (default: all)
  --theme <id>           aero|breeze|aqua|cloud|y2k|vaporwave|dreamcore (default: aero)
  --no-ci                omit the Cloudflare Pages CI workflow
  --pages-project <n>    Pages project name for the deploy job (default: <name>)
  --dir <path>           target directory (default: ./<name>)
  --skip-install         do not run bun install
  --help, -h             this help
`;
}

function humanTitle(name: string): string {
  const base = name.split('/').at(-1) ?? name;
  const words = base.split(/[-_]+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(help());
    return;
  }

  const appIds = templateAppIds();
  const appOptions = appIds.map((id) => ({ id, label: id }));

  let name = args.name ?? 'webos-app';
  let apps = args.apps;
  let theme = args.theme ?? 'aero';
  let ci = args.ci;
  let pagesProject = args.pagesProject;

  if (!args.yes) {
    if (!process.stdin.isTTY) {
      console.error(
        'not a TTY: use --yes (or --name/--apps/--theme flags) to scaffold non-interactively',
      );
      process.exit(1);
    }
    name = await askText('Project name', name);
    while (!APP_NAME_RE.test(name)) {
      console.error('invalid npm package name (lowercase, no spaces)');
      name = await askText('Project name', 'webos-app');
    }
    if (!args.apps) {
      apps = await askMulti('Select apps', appOptions, appIds);
    }
    if (!args.theme) {
      theme = await askSelect(
        'Default theme',
        themeIds().map((id) => ({ id, label: id })),
        'aero',
      );
    }
    ci = args.ci && (await askConfirm('Include the Cloudflare Pages CI workflow?', true));
    if (ci && !args.pagesProject) {
      pagesProject = await askText('Cloudflare Pages project name', name);
    }
  }

  const selectedApps = apps ?? appIds;
  if (selectedApps.length < 2) {
    console.error(`at least two apps required, got: ${selectedApps.join(',') || 'none'}`);
    process.exit(1);
  }
  const unknown = selectedApps.filter((a) => !appIds.includes(a));
  if (unknown.length > 0) {
    console.error(`unknown apps: ${unknown.join(',')} (available: ${appIds.join(',')})`);
    process.exit(1);
  }

  const result = scaffold({
    name,
    title: humanTitle(name),
    apps: selectedApps,
    theme,
    ci,
    pagesProject: pagesProject ?? name,
    dir: args.dir ?? `./${name}`,
    skipInstall: args.skipInstall,
  });

  console.log(generatedSummary(result, name));
}

main().catch((err) => {
  console.error(`create-webos: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
