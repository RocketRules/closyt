const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/* Model weights ship as a binary asset, so Metro has to treat .bin as one. */
config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];

/*
 * tfjs-core's Node platform does `require('node-fetch')`, which drags in Node
 * built-ins (http, zlib, stream) that do not exist in React Native. That branch
 * never runs here — we register our own platform in src/logic/tfPlatform.js —
 * but Metro still has to resolve the import, so point it at a stub.
 */
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'node-fetch': require.resolve('./src/logic/nodeFetchStub.js'),
};

module.exports = config;
