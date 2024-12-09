import { JSDOM } from "jsdom";
const { window } = new JSDOM();
const { DOMParser, XMLSerializer, document } = window;

Object.assign(global, { DOMParser, XMLSerializer, window, document });

/**
 * @type {import('./index.d').nest}
 */
export const nest = async (...args) => {
  const { nest } = await import("./index.mjs");
  return nest(...args);
};
