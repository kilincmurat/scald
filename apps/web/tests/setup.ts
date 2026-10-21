// The data-entry store persists to localStorage, which Node lacks. Without
// this stand-in, zustand warns on every write and nothing survives a
// simulated reload — so the tests couldn't check that unsaved changes do.
if (typeof globalThis.localStorage === 'undefined') {
  const data = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  } satisfies Storage;
}
