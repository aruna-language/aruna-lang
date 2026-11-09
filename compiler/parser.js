import { ArunaError } from './diagnostics.js';

const describe = (t, p) =>
  t.type === 'eof' ? 'end of file' : t.type === 'nl' ? 'end of line' :
  t.type === 'kw' ? `'${p.keywords[t.value]}'` : t.type === 'typename' ? `'${p.types[t.value]}'` :
  t.type === 'string' ? 'a string' : t.type === 'int' || t.type === 'float' ? `number ${t.value}` : `'${t.value}'`;

/** Recursive-descent parser. Stops at the first syntax error. */
export function parse(tokens, profile) {
  let i = 0;
  const tok = () => tokens[i];
  const peek = () => tokens[Math.min(i + 1, tokens.length - 1)];
  const next = () => { const t = tokens[i]; if (t.type !== 'eof') i++; return t; };
  const isOp = v => tok().type === 'op' && tok().value === v;
  const isKw = v => tok().type === 'kw' && tok().value === v;
  const fail = (m, t = tok(), hint = null) => { throw new ArunaError('E101', m, t.line, t.col, t.len || 1, hint); };
  const found = () => describe(tok(), profile);
  const expectOp = (v, ctx = '') => { if (!isOp(v)) fail(`expected '${v}'${ctx}, found ${found()}`); return next(); };
  const skipNl = () => { while (tok().type === 'nl') i++; };
  const at = (kind, t, props) => ({ kind, line: t.line, col: t.col, len: t.len || 1, ...props });
  const atEnd = () => tok().type === 'nl' || tok().type === 'eof' || isOp('}');

  function endStmt() {
    if (tok().type === 'nl') { skipNl(); return; }
    if (tok().type === 'eof' || isOp('}')) return;
    fail(`expected end of line after statement, found ${found()}`, tok(), 'put each statement on its own line');
  }
  function ident(what) {
    if (tok().type !== 'ident') fail(`expected ${what}, found ${found()}`);
    return next();
  }
  function type() {
    const t = tok();
    if (t.type !== 'typename') fail(`expected a type, found ${found()}`);
    next();
    let nullable = false;
    if (isOp('?')) { next(); nullable = true; }
    return at('Type', t, { name: t.value, nullable });
  }
  function block() {
    expectOp('{', ' to start a block');
    skipNl();
    const body = [];
    while (!isOp('}')) {
      if (tok().type === 'eof') fail("expected '}' to close the block, found end of file");
      body.push(statement()); endStmt(); skipNl();
    }
    next();
    return { kind: 'Block', body };
  }
  function fnDecl() {
    const t = next(); const name = ident('a function name');
    expectOp('(', ' after the function name');
    const params = [];
    if (!isOp(')')) {
      for (;;) {
        const p = ident('a parameter name'); expectOp(':', ' after the parameter name');
        params.push({ name: p.value, type: type(), line: p.line, col: p.col, len: p.len });
        if (isOp(',')) { next(); continue; }
        break;
      }
    }
    expectOp(')', ' to close the parameter list');
    let retType = null;
    if (isOp(':')) { next(); retType = type(); }
    return at('FnDecl', name, { name: name.value, params, retType, body: block(), kw: t });
  }
  function letStmt() {
    const t = next(); const name = ident('a variable name');
    let annot = null;
    if (isOp(':')) { next(); annot = type(); }
    expectOp('=', ' in a variable declaration');
    return at('Let', name, { mutable: t.value === 'var', name: name.value, annot, init: expr() });
  }
  function ifStmt() {
    const t = next(); const cond = expr(); const then = block(); let els = null;
    if (isKw('else')) { next(); els = isKw('if') ? ifStmt() : block(); }
    return at('If', t, { cond, then, else: els });
  }
  function statement() {
    const t = tok();
    if (t.type === 'kw') {
      switch (t.value) {
        case 'let': case 'var': return letStmt();
        case 'print': next(); return at('Print', t, { expr: expr() });
        case 'if': return ifStmt();
        case 'while': { next(); const cond = expr(); return at('While', t, { cond, body: block() }); }
        case 'return': { next(); return at('Return', t, { expr: atEnd() ? null : expr() }); }
        case 'fn': return fail('functions can only be declared at the top level of a file', t);
        case 'else': return fail(`unexpected '${profile.keywords.else}'`, t, "'else' must follow the closing '}' of an 'if' on the same line");
      }
    }
    if (t.type === 'ident' && peek().type === 'op' && peek().value === '=') { next(); next(); return at('Assign', t, { name: t.value, value: expr() }); }
    return at('ExprStmt', t, { expr: expr() });
  }

  // Expressions, lowest to highest precedence: ?? , || , && , == != , < <= > >= , + - , * / % , unary
  function leftAssoc(sub, ops) {
    return () => {
      let l = sub();
      while (tok().type === 'op' && ops.includes(tok().value)) { const t = next(); l = at('Binary', t, { op: t.value, l, r: sub() }); }
      return l;
    };
  }
  const unary = () => {
    if (isOp('-') || isOp('!')) { const t = next(); return at('Unary', t, { op: t.value, expr: unary() }); }
    return primary();
  };
  const mul = leftAssoc(unary, ['*', '/', '%']);
  const add = leftAssoc(mul, ['+', '-']);
  const cmp = leftAssoc(add, ['<', '<=', '>', '>=']);
  const eq = leftAssoc(cmp, ['==', '!=']);
  const and = leftAssoc(eq, ['&&']);
  const or = leftAssoc(and, ['||']);
  function expr() {
    const l = or();
    if (isOp('??')) { const t = next(); return at('Binary', t, { op: '??', l, r: expr() }); }
    return l;
  }
  function primary() {
    const t = tok();
    switch (t.type) {
      case 'int': next(); return at('Lit', t, { vt: 'int', value: t.value });
      case 'float': next(); return at('Lit', t, { vt: 'float', value: t.value });
      case 'string': next(); return at('Lit', t, { vt: 'string', value: t.value });
      case 'kw':
        if (t.value === 'true' || t.value === 'false') { next(); return at('Lit', t, { vt: 'bool', value: t.value === 'true' }); }
        if (t.value === 'null') { next(); return at('Lit', t, { vt: 'null', value: null }); }
        break;
      case 'ident':
        next();
        if (isOp('(')) {
          next(); const args = [];
          if (!isOp(')')) for (;;) { args.push(expr()); if (isOp(',')) { next(); continue; } break; }
          expectOp(')', ' to close the argument list');
          return at('Call', t, { name: t.value, args });
        }
        return at('Var', t, { name: t.value });
      case 'op':
        if (t.value === '(') { next(); const e = expr(); expectOp(')'); return e; }
        break;
    }
    return fail(`expected an expression, found ${found()}`);
  }

  const body = [];
  skipNl();
  while (tok().type !== 'eof') {
    body.push(isKw('fn') ? fnDecl() : statement());
    endStmt(); skipNl();
  }
  return { kind: 'Program', body };
}
