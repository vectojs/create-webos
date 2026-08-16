import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { scaffold, templateAppIds } from '../src/generate';

// Full generated-project gates: scaffold → install → check/test/build.
// Requires registry access, so it runs via `bun run test:e2e` in CI.

let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'create-webos-gates-'));
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function run(cmd: string, args: string[], cwd: string): { status: number; out: string } {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { status: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('generated project gates', () => {
  it('scaffolds and passes check/test/build', { timeout: 300_000 }, () => {
    const dir = join(tmp, 'app');
    scaffold({
      name: 'webos-app',
      title: 'WebOS App',
      apps: templateAppIds(),
      theme: 'aero',
      ci: false,
      pagesProject: 'webos-app',
      dir,
      skipInstall: false,
    });

    expect(existsSync(join(dir, 'node_modules'))).toBe(true);

    const check = run('bun', ['run', 'check'], dir);
    expect(check.status, check.out).toBe(0);

    const test = run('bun', ['test'], dir);
    expect(test.status, test.out).toBe(0);

    const build = run('bun', ['run', 'build'], dir);
    expect(build.status, build.out).toBe(0);
    expect(existsSync(join(dir, 'dist/index.html'))).toBe(true);
  });
});
