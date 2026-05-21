import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const keyPath = join(process.cwd(), 'src-tauri', 'updater-keys', 'md-forge.key');
const tauriBin = join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'tauri.cmd' : 'tauri');

if (!existsSync(keyPath)) {
  console.error(`Missing Tauri signing key: ${keyPath}`);
  process.exit(1);
}

const child = spawn(tauriBin, ['build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: readFileSync(keyPath, 'utf8'),
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? '',
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`tauri build terminated by ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
