# create-webos

Scaffold a VectoJS desktop website in one command — a canvas-native
desktop environment (windows, taskbar, start menu, and ten apps) built on
`@vectojs/desktop`, ready to customize.

```bash
bun create webos
```

or

```bash
bunx create-webos
```

## What you get

- A complete VectoJS project: `@vectojs/core` + `@vectojs/desktop` +
  `@vectojs/ui` + `@vectojs/styles` + `@vectojs/devtools`.
- Ten apps (terminal, files, notes, paint, browser, calculator, sysmon,
  settings, clock, about), each a plain canvas entity — no HTML, no CSS.
- Seven theme presets (aero, breeze, aqua, cloud, y2k, vaporwave,
  dreamcore).
- A customization entry point in `src/config.ts` (apps, theme, shortcuts,
  VFS) and `src/desktop/icons.ts` (desktop icons).
- Full toolchain: TypeScript, Vite, oxfmt, oxlint, markdownlint, lefthook,
  commitlint, a happy-dom boot smoke test with an audit-clean gate, and a
  Cloudflare Pages CI workflow.

## Options

```text
bun create webos [options]

  --yes, -y              use defaults, skip prompts
  --name <pkg>           npm package name (default: webos-app)
  --apps <a,b,c|all>     app subset, min 2 (default: all)
  --theme <id>           aero|breeze|aqua|cloud|y2k|vaporwave|dreamcore (default: aero)
  --no-ci                omit the Cloudflare Pages CI workflow
  --pages-project <n>    Pages project name for the deploy job (default: <name>)
  --dir <path>           target directory (default: ./<name>)
  --skip-install         do not run bun install
```

## Develop

The template in `template/` is a one-way sync from the
[vectojs/webos](https://github.com/vectojs/webos) reference app:

```bash
scripts/sync-template.sh /path/to/vectojs-webos-repo   # copies + injects markers
bun run test                                           # unit tests
bun run test:e2e                                       # scaffold → check/test/build
bun run build                                          # tsc → dist/
```

The generator rewrites the marker sections (`@apps-*`, `@icons-*`, `@seed-*`)
and the `{{name}}`/`{{title}}`/`{{pagesProject}}` placeholders to produce the
final project.
