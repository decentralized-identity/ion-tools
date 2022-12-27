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
  outfile: 'dist/browser-bundle.js',
  allowOverwrite: true
});