const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = callback => setTimeout(callback, 0);

require('@babel/register')({
  presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }]],
});

require('./bench_react.jsx');