// Polyfill Symbol.dispose and Symbol.asyncDispose for Node < 20.5
// Must be imported before @cursor/sdk
if (typeof Symbol.dispose === 'undefined') {
  Object.defineProperty(Symbol, 'dispose', {
    value: Symbol.for('Symbol.dispose'),
    writable: false,
    enumerable: false,
    configurable: false,
  });
}
if (typeof Symbol.asyncDispose === 'undefined') {
  Object.defineProperty(Symbol, 'asyncDispose', {
    value: Symbol.for('Symbol.asyncDispose'),
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

export {};
