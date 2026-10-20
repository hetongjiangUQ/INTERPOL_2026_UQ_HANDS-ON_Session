import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(new URL('..', import.meta.url).pathname);
const excludedRoots = new Set([
  '.git',
  '.next',
  '.vinext',
  '.wrangler',
  'dist',
  'node_modules',
  'outputs',
  'work',
  '.package-store',
  '.pip-cache',
  'TO_REMOVE',
  'processor/.venv',
  'processor/cache',
  'processor/outputs',
]);
const modelExtensions = new Set([
  '.pt',
  '.pth',
  '.ckpt',
  '.safetensors',
  '.onnx',
  '.gguf',
  '.h5',
  '.hdf5',
  '.tflite',
  '.mlmodel',
  '.pb',
  '.engine',
  '.plan',
  '.trt',
  '.bin',
  '.pkl',
  '.pickle',
  '.joblib',
  '.mar',
  '.params',
  '.pdparams',
  '.pdmodel',
  '.caffemodel',
  '.weights',
  '.mlpackage',
]);

function sourcePaths(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    const sourceRelativePath = relative(root, path);
    if (
      entry.isDirectory() &&
      (entry.name === '__pycache__' || excludedRoots.has(sourceRelativePath))
    )
      return [];
    return entry.isDirectory() ? [path, ...sourcePaths(path)] : [path];
  });
}

void test('distributable website source contains no model weights or compiled inference artifacts', () => {
  const forbidden = sourcePaths(root)
    .filter(
      (path) =>
        modelExtensions.has(extname(path).toLowerCase()) ||
        path.endsWith('/pytorch_model.bin'),
    )
    .map((path) => relative(root, path));
  assert.deepEqual(
    forbidden,
    [],
    `Remove model artifacts from the website source: ${forbidden.join(', ')}`,
  );
});
