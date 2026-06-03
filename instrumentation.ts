export async function register() {
  if (process.env.NODE_ENV !== 'development') return;
  if (!process.env.SUPABASE_DB_PASSWORD?.trim()) return;

  try {
    const { spawn } = await import(/* webpackIgnore: true */ 'node:child_process');
    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', ['scripts/apply-db-patch.mjs'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      });
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`db:patch exit ${code}`))));
    });
    console.log('[samsiq] Database patch applied (SUPABASE_DB_PASSWORD)');
  } catch (err) {
    console.warn('[samsiq] Auto db:patch failed:', err instanceof Error ? err.message : err);
  }
}
