/**
 * Hand-rolled interactive prompts over readline — zero runtime deps.
 * Multi-select: number keys toggle, Enter confirms.
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

interface Option {
  id: string;
  label: string;
}

function rl() {
  return createInterface({ input: stdin, output: stdout });
}

export async function askText(question: string, def: string): Promise<string> {
  const iface = rl();
  try {
    const answer = await iface.question(`${question} (${def}): `);
    return answer.trim() === '' ? def : answer.trim();
  } finally {
    iface.close();
  }
}

export async function askConfirm(question: string, def: boolean): Promise<boolean> {
  const iface = rl();
  try {
    const answer = await iface.question(`${question} [${def ? 'Y/n' : 'y/N'}]: `);
    const a = answer.trim().toLowerCase();
    if (a === '') return def;
    return a === 'y' || a === 'yes';
  } finally {
    iface.close();
  }
}

export async function askSelect(
  question: string,
  options: readonly Option[],
  def: string,
): Promise<string> {
  const iface = rl();
  try {
    console.log(`${question}`);
    for (const [i, o] of options.entries()) console.log(`  ${i + 1}. ${o.label}`);
    const answer = await iface.question(`choose [1-${options.length}] (${def}): `);
    const n = Number.parseInt(answer.trim(), 10);
    if (Number.isNaN(n)) return def;
    const picked = options[n - 1];
    return picked ? picked.id : def;
  } finally {
    iface.close();
  }
}

export async function askMulti(
  question: string,
  options: readonly Option[],
  defaults: readonly string[],
): Promise<string[]> {
  const iface = rl();
  const selected = new Set(defaults);
  try {
    console.log(`${question} (number toggles, Enter confirms)`);
    let answer = '';
    for (;;) {
      const marks = options
        .map((o, i) => `${selected.has(o.id) ? '[x]' : '[ ]'} ${i + 1}. ${o.label}`)
        .join('\n');
      iface.pause();
      console.log(marks);
      iface.resume();
      answer = await iface.question('> ');
      const t = answer.trim().toLowerCase();
      if (t === '') break;
      const n = Number.parseInt(t, 10);
      if (!Number.isNaN(n) && options[n - 1]) {
        const id = options[n - 1].id;
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
      }
    }
    return options.filter((o) => selected.has(o.id)).map((o) => o.id);
  } finally {
    iface.close();
  }
}
