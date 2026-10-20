import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

const LOCAL_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'evidence-lab-d1',
      database_id: LOCAL_PLACEHOLDER_DATABASE_ID,
    },
  ],
  r2_buckets: [
    {
      binding: 'FILES',
      bucket_name: 'evidence-lab-files',
    },
  ],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: { watch: { ignored: ['**/processor/**','**/.package-store/**','**/TO_REMOVE/**'], ...(isCodexSeatbeltSandbox ? {useFsEvents:false,usePolling:true}:{}) } },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
