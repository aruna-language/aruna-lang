export const mk = (k, nullable = false) => ({ k, nullable });
export const ERR = mk('error');
export const NULL = mk('null', true);
export const VOID = mk('void');
export const isErr = t => t.k === 'error';
export const isNum = t => t.k === 'int' || t.k === 'float';

export function show(t, profile) {
  if (t.k === 'null') return 'null';
  if (t.k === 'void') return 'no value';
  if (t.k === 'error') return '<error>';
  return profile.types[t.k] + (t.nullable ? '?' : '');
}

/** Can a value of type `from` be stored where `to` is expected? */
export function assignable(to, from) {
  if (isErr(to) || isErr(from)) return true;
  if (from.k === 'null') return to.nullable;
  if (from.k !== to.k) return false;
  return !from.nullable || to.nullable;
}
