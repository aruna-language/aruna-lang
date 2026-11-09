// PROVISIONAL vocabulary.
// These words are neutral placeholders. They are NOT Madurese and make no
// linguistic claim. They exist only so the compiler infrastructure can run
// while the creator validates a real Madurese glossary.
// Keys are semantic ids used by the compiler; values are the surface words.
export const profile = {
  name: 'provisional',
  keywords: {
    let: 'let', var: 'var', fn: 'fn', return: 'return',
    if: 'if', else: 'else', while: 'while', print: 'print',
    true: 'true', false: 'false', null: 'null',
  },
  types: { int: 'int', float: 'float', string: 'string', bool: 'bool' },
  builtins: { str: 'str', len: 'len', toInt: 'to_int', readLine: 'read_line' },
};
