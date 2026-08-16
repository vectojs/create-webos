# {{title}}

A VectoJS desktop website scaffolded with `bun create webos` — a
canvas-native desktop environment: windows, taskbar, start menu, and a set
of apps, all rendered on one `<canvas>` by `@vectojs/desktop`.

## Run it

```bash
bun install
bun run dev        # local dev server
bun run build      # tsc + vite production build
bun test           # happy-dom boot smoke + audit-clean gate
bun run check      # oxfmt + oxlint + markdownlint
```

Open `http://localhost:5173/?debug` for the devtools VMT inspector (dynamic
import — the production bundle carries no devtools code).

## Customize

Everything starts in **`src/config.ts`** — the single customization entry:

- **apps** — the start-menu registry (`buildConfig` assembles them)
- **theme** — preset token sets from `src/model/theme-*.ts` (aero, breeze,
  aqua, cloud, y2k, vaporwave, dreamcore); pick the default via
  `DEFAULT_PRESET`, switch at runtime from the Themes app or the terminal
  `theme` command
- **shortcuts** — chords mapped to `open-app` / `close-focused` /
  `toggle-start`
- **vfs** — the in-memory file system seeded at boot (Files, Notepad)

Add an app by creating `src/apps/my-app.ts` and registering it in
`config.ts`; add a desktop icon entry in `src/desktop/icons.ts`
(`DESKTOP_ICON_SPECS`).

## Deploy

The repo includes a Cloudflare Pages workflow (`.github/workflows/ci.yml`).
Before the first push, create the Pages project and set the repo secrets:

```bash
wrangler pages project create {{pagesProject}}
# repo secrets: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
```

The deploy job runs on every push to `main` after `verify` passes.

## Structure

```text
src/
├── config.ts        # the customization entry point
├── apps/            # the built-in applications
├── desktop/         # boot, icons, click-catcher/marquee
├── model/           # pure TS logic (terminal, calculator, themes) + tests
└── app/             # shared UI helpers
```

Built on `@vectojs/core` + `@vectojs/desktop` + `@vectojs/ui` +
`@vectojs/styles` + `@vectojs/devtools`. Read the VectoJS docs at
<https://vectojs.org> and the paradigm guide in the
[vectojs-skills](https://github.com/vectojs/vectojs-skills) repo.
