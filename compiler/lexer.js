import { ArunaError } from './diagnostics.js';

const TWO = new Set(['==', '!=', '<=', '>=', '&&', '||', '??']);
const ONE = new Set([...'+-*/%<>=!?(){},:']);
const START = /[\p{L}_]/u, PART = /[\p{L}\p{N}_']/u, DIGIT = /[0-9]/;
const ESC = { n: '\n', t: '\t', '"': '"', '\\': '\\' };

/** Turns source text into tokens. Vocabulary comes from the given profile. */
export function tokenize(src, profile) {
  const kw = new Map(Object.entries(profile.keywords).map(([id, w]) => [w, id]));
  const ty = new Map(Object.entries(profile.types).map(([id, w]) => [w, id]));
  const out = [];
  let i = 0, line = 1, col = 1, depth = 0;
  const adv = () => { if (src[i] === '\n') { line++; col = 1; } else col++; i++; };
  const push = (type, value, l, c, len) => out.push({ type, value, line: l, col: c, len });

  while (i < src.length) {
    const ch = src[i], l = line, c = col;
    if (ch === ' ' || ch === '\t' || ch === '\r') { adv(); continue; }
    if (ch === '\n') { adv(); if (depth === 0) push('nl', '\n', l, c, 1); continue; }
    if (ch === ';') { adv(); push('nl', ';', l, c, 1); continue; }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') adv(); continue; }

    if (DIGIT.test(ch)) {
      const s = i; let isFloat = false;
      while (DIGIT.test(src[i] ?? '')) adv();
      if (src[i] === '.' && DIGIT.test(src[i + 1] ?? '')) { isFloat = true; adv(); while (DIGIT.test(src[i] ?? '')) adv(); }
      const text = src.slice(s, i);
      if (START.test(src[i] ?? '')) throw new ArunaError('E004', `invalid number '${text}${src[i]}'`, l, c, text.length + 1, 'separate a number from a following word');
      const v = Number(text);
      if (!isFloat && !Number.isSafeInteger(v)) throw new ArunaError('E004', `integer literal '${text}' is too large`, l, c, text.length);
      push(isFloat ? 'float' : 'int', v, l, c, text.length); continue;
    }

    if (START.test(ch)) {
      const s = i; adv();
      while (i < src.length && PART.test(src[i])) adv();
      const w = src.slice(s, i);
      if (kw.has(w)) push('kw', kw.get(w), l, c, w.length);
      else if (ty.has(w)) push('typename', ty.get(w), l, c, w.length);
      else push('ident', w, l, c, w.length);
      continue;
    }

    if (ch === '"') {
      const s = i; adv(); let v = '';
      for (;;) {
        const d = src[i];
        if (d === undefined || d === '\n') throw new ArunaError('E002', 'unterminated string literal', l, c, 1, 'strings must be closed with " on the same line');
        if (d === '"') { adv(); break; }
        if (d === '\\') {
          const el = line, ec = col; adv();
          const e = src[i];
          if (e === undefined || e === '\n') throw new ArunaError('E002', 'unterminated string literal', l, c, 1);
          if (!Object.hasOwn(ESC, e)) throw new ArunaError('E003', `unknown escape sequence '\\${e}'`, el, ec, 2, 'supported escapes: \\n \\t \\" \\\\');
          v += ESC[e]; adv();
        } else { v += d; adv(); }
      }
      push('string', v, l, c, i - s); continue;
    }

    const two = src.slice(i, i + 2);
    if (TWO.has(two)) { adv(); adv(); push('op', two, l, c, 2); continue; }
    if (ONE.has(ch)) {
      adv();
      if (ch === '(') depth++;
      if (ch === ')' && depth > 0) depth--;
      push('op', ch, l, c, 1); continue;
    }
    throw new ArunaError('E001', `unexpected character '${String.fromCodePoint(src.codePointAt(i))}'`, l, c, 1);
  }
  push('eof', null, line, col, 1);
  return out;
}
