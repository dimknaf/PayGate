export async function register() {
  // Polyfill Symbol.dispose and Symbol.asyncDispose for Node < 20.5
  // Required by @cursor/sdk before any other module loads
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
}
