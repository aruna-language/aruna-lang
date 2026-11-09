import { profile as provisional } from './provisional.js';
import { profile as approved } from './approved.js';

export const REQUIRED = {
  keywords: ['let', 'var', 'fn', 'return', 'if', 'else', 'while', 'print', 'true', 'false', 'null'],
  types: ['int', 'float', 'string', 'bool'],
  builtins: ['str', 'len', 'toInt', 'readLine'],
};
const WORD = /^[\p{L}_][\p{L}\p{N}_']*$/u;

export function validateProfile(p) {
  const seen = new Map();
  for (const group of Object.keys(REQUIRED)) {
    for (const id of REQUIRED[group]) {
      const w = p[group]?.[id];
      if (typeof w !== 'string' || !WORD.test(w)) throw new Error(`profile '${p.name}': ${group}.${id} must be a valid word`);
      if (seen.has(w)) throw new Error(`profile '${p.name}': word '${w}' is used twice (${seen.get(w)} and ${group}.${id})`);
      seen.set(w, `${group}.${id}`);
    }
  }
  return p;
}

export { provisional, approved };
export const isProvisional = approved == null;
export const activeProfile = validateProfile(approved ?? provisional);
