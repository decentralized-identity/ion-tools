import esbuild from 'esbuild';

esbuild.build({
  entryPoints: [ './src/index.js' ],
  bundle: true,
  format: 'esm',
  sourcemap: true,
  platform: 'browser',
  target: [ 'chrome101' ],
  define: {
    'global': 'globalThis'
  },
  outfile: 'dist/browser/esm.js',
  allowOverwrite: true
});

esbuild.build({
  entryPoints: [ './src/index.js' ],
  bundle: true,
  format: 'iife',
  globalName: 'IonTools',
  sourcemap: true,
  platform: 'browser',
  target: [ 'chrome101' ],
  define: {
    'global': 'globalThis'
  },
  outfile: 'dist/browser/iife.js',
  allowOverwrite: true
});