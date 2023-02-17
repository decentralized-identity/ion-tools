import esbuild from 'esbuild';

esbuild.build({
  entryPoints: [ './src/index.js' ],
  bundle: true,
  packages: 'external',
  format: 'cjs',
  sourcemap: true,
  platform: 'node',
  outfile: 'dist/cjs/index.js',
  allowOverwrite: true
});