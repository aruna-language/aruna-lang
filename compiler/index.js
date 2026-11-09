import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { check } from './checker.js';
import { ArunaError } from './diagnostics.js';

/** Source text -> { program, diagnostics }. Never throws for user errors. */
export function compile(source, { profile }) {
  try {
    const program = parse(tokenize(source, profile), profile);
    return { program, diagnostics: check(program, profile) };
  } catch (e) {
    if (e instanceof ArunaError) return { program: null, diagnostics: [e] };
    if (e instanceof RangeError) return { program: null, diagnostics: [new ArunaError('E199', 'program is nested too deeply', 1, 1)] };
    throw e;
  }
}
