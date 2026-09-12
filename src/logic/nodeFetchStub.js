/*
 * Stub for node-fetch.
 *
 * tfjs-core only requires node-fetch from its Node platform, which we never
 * activate — React Native has a global fetch and we register our own platform
 * in tfPlatform.js. Metro still has to resolve the module, and the real one
 * pulls in Node built-ins that do not exist here, so it resolves to this.
 */
module.exports = typeof fetch !== 'undefined' ? fetch : () => {
  throw new Error('node-fetch is not available in React Native');
};
module.exports.default = module.exports;
