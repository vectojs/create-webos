import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffold, templateAppIds, themeIds } from '../src/generate';

let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'create-webos-'));
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('scaffold', () => {
  it('exposes the full template app set', () => {
    const apps = templateAppIds();
    expect(apps.length).toBeGreaterThanOrEqual(10);
    for (const t of ['aero', 'breeze', 'aqua', 'cloud', 'y2k', 'vaporwave', 'dreamcore']) {
      expect(themeIds()).toContain(t);
    }
  });

  it('generates a full project with placeholders substituted', () => {
    const dir = join(tmp, 'full');
    const result = scaffold({
      name: 'my-desktop',
      title: 'My Desktop',
      apps: templateAppIds(),
      theme: 'aero',
      ci: true,
      pagesProject: 'my-desktop-pages',
      dir,
      skipInstall: true,
    });
    expect(result.dir).toBe(dir);

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-desktop');
    expect(pkg.dependencies['@vectojs/desktop']).toBe('0.6.0');
    expect(pkg.scripts.deploy).toContain('my-desktop-pages');

    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).toContain('<title>My Desktop</title>');
    expect(html).not.toContain('{{title}}');

    const config = readFileSync(join(dir, 'src/config.ts'), 'utf8');
    expect(config).toContain('DEFAULT_PRESET = aeroPreset');
    expect((config.match(/import \{ [^}]+\} from '\.\/apps\//g) ?? []).length).toBe(10);

    const appSources = templateAppIds().map((id) =>
      readFileSync(join(dir, `src/apps/${id}.ts`), 'utf8'),
    );
    expect(appSources.every((source) => source.includes('iconSvg: appIconSvg('))).toBe(true);
    expect(appSources.every((source) => !/\n\s*icon:\s*['"]/.test(source))).toBe(true);

    const ci = readFileSync(join(dir, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('my-desktop-pages');
    expect(ci).not.toContain('{{pagesProject}}');
    expect(ci).not.toContain('{{name}}');
  });

  it('filters apps, icons and seed windows to the selected subset', () => {
    const dir = join(tmp, 'subset');
    scaffold({
      name: 'mini-desktop',
      title: 'Mini',
      apps: ['terminal', 'files', 'clock'],
      theme: 'breeze',
      ci: false,
      pagesProject: 'x',
      dir,
      skipInstall: true,
    });

    const config = readFileSync(join(dir, 'src/config.ts'), 'utf8');
    const imports = config.match(/import \{ [^}]+\} from '\.\/apps\//g) ?? [];
    expect(imports.length).toBe(3);
    expect(config).not.toContain('notesApp');
    expect(config).toContain('createTerminalApp');
    expect(config).toContain('DEFAULT_PRESET = breezePreset');
    expect(config).toContain("import { breezePreset } from './model/theme-breeze';");

    const icons = readFileSync(join(dir, 'src/desktop/icons.ts'), 'utf8');
    expect((icons.match(/appId: '/g) ?? []).length).toBe(3);

    const main = readFileSync(join(dir, 'src/desktop/main.ts'), 'utf8');
    expect((main.match(/shell\.open\('/g) ?? []).length).toBe(2);
    expect(main).toContain('seedWin0');
    expect(main).not.toContain('termWin');

    expect(existsSync(join(dir, '.github/workflows/ci.yml'))).toBe(false);
  });

  it('rejects invalid names and unknown themes', () => {
    expect(() =>
      scaffold({
        name: 'Not Valid!',
        title: 'x',
        apps: templateAppIds(),
        theme: 'aero',
        ci: false,
        pagesProject: 'x',
        dir: join(tmp, 'bad'),
        skipInstall: true,
      }),
    ).toThrow(/invalid package name/);
    expect(() =>
      scaffold({
        name: 'ok-name',
        title: 'x',
        apps: templateAppIds(),
        theme: 'nope',
        ci: false,
        pagesProject: 'x',
        dir: join(tmp, 'bad2'),
        skipInstall: true,
      }),
    ).toThrow(/unknown theme/);
  });
});
