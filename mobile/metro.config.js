// Metro config: the app also reads a few browser-free modules straight from the website's source
// (resume templates, the footer helpers and shared types) through the @web/* alias in tsconfig, so
// both always use the same templates. Only files under frontend/src are watched.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const webSrc = path.resolve(__dirname, '../frontend/src');

config.watchFolders = [...(config.watchFolders || []), webSrc];
// Website files import nothing from node_modules that the app lacks, but resolve from the app's own
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
