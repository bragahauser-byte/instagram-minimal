/**
 * Copia dist/safari (gerado por build-extensions) para dentro do projeto
 * Xcode, onde vira o recurso da Safari Web Extension.
 *   npm run build:ext && node scripts/sync-safari.mjs
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(root, 'dist/safari');
const to = resolve(root, 'apps/ios/Extension/Resources');
if (!existsSync(from)) throw new Error('Rode "npm run build:ext" antes.');
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log('✓ apps/ios/Extension/Resources atualizado a partir de dist/safari');
