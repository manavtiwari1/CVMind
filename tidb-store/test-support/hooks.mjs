// Module resolution hook: `mongodb-memory-server` -> the TiDB stand-in
export async function resolve(specifier, context, next) {
  if (specifier === 'mongodb-memory-server') {
    return { url: new URL('./memory-server.mjs', import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
