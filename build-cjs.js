import esbuild from 'esbuild';
import packageJson from './package.json' assert { type: 'json' };

// list of dependencies that _dont_ ship cjs
const includeList = new Set([
  '@decentralized-identity/ion-sdk',
  '@noble/ed25519',
  '@noble/secp256k1',
  'multiformats'
]);

// create list of dependencies that we _do not_ want to include in our bundle
const excludeList = [];
for (const dependency in packageJson.dependencies) {
  if (includeList.has(dependency)) {
    continue;
  } else {
    excludeList.push(dependency);
  }
}

esbuild.build({
  entryPoints: [ './src/index.js' ],
  bundle: true,
  external: excludeList,
  format: 'cjs',
  sourcemap: true,
  platform: 'node',
  outfile: 'dist/cjs/index.js',
  allowOverwrite: true
});