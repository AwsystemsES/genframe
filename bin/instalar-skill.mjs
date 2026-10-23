/* Enlaza la skill de este repositorio en ~/.claude/skills/turboframe para usarla desde cualquier proyecto de Claude Code. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {fileURLToPath} from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(os.homedir(), '.claude', 'skills', 'turboframe');
fs.mkdirSync(path.dirname(target), {recursive: true});
if (fs.existsSync(target) || fs.lstatSync(target, {throwIfNoEntry: false})) fs.rmSync(target, {recursive: true, force: true});
fs.symlinkSync(path.join(ROOT, '.claude', 'skills', 'turboframe'), target);
console.log('✔ skill enlazada en ' + target + ' → ' + path.join(ROOT, '.claude', 'skills', 'turboframe'));
