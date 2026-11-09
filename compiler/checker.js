import { ArunaError } from './diagnostics.js';
import { mk, ERR, VOID, show, assignable, isErr, isNum } from './types.js';

class Scope {
  constructor(parent = null) { this.m = new Map(); this.parent = parent; }
  get(n) { return this.m.get(n) ?? this.parent?.get(n); }
  has(n) { return this.m.has(n); }
  set(n, s) { this.m.set(n, s); }
}

const BUILTIN_SIGS = {
  str: { params: null, ret: mk('string') },             // accepts exactly one value of any type
  len: { params: [mk('string')], ret: mk('int') },
  toInt: { params: [mk('string')], ret: mk('int', true) },
  readLine: { params: [], ret: mk('string', true) },
};

/** Semantic analysis: names, static types, inference, nullability. Returns a list of diagnostics. */
export function check(program, profile) {
  const diags = [];
  const err = (code, msg, n, hint = null) => diags.push(new ArunaError(code, msg, n.line, n.col, n.len || 1, hint));
  const T = t => show(t, profile);
  const builtinIds = new Map(Object.entries(profile.builtins).map(([id, w]) => [w, id]));
  const fns = new Map();
  const typeOf = tn => mk(tn.name, tn.nullable);

  const mismatch = (n, expected, got, what) => {
    if (isErr(expected) || isErr(got)) return;
    let hint = null;
    if (got.k === expected.k && got.nullable && !expected.nullable) hint = "the value may be null; check it with '!= null' or use '??'";
    else if ((expected.k === 'int' && got.k === 'float') || (expected.k === 'float' && got.k === 'int')) hint = 'Aruna never converts between int and float implicitly';
    err('E203', `${what}: expected ${T(expected)}, found ${T(got)}`, n, hint);
  };
  const nullErr = (n, t) => err('E205', `value of type ${T(t)} may be null`, n, "check it with '!= null' first, or provide a default with '??'");
  const needBool = (n, t, what) => { if (!isErr(t) && (t.k !== 'bool' || t.nullable)) mismatch(n, mk('bool'), t, what); };

  // --- narrowing: `x != null` makes an immutable x non-null inside the guarded block
  function narrowing(n) {
    if (n.kind === 'Binary') {
      const { op, l, r } = n;
      if (op === '!=' || op === '==') {
        const v = l.kind === 'Var' && r.kind === 'Lit' && r.vt === 'null' ? l : r.kind === 'Var' && l.kind === 'Lit' && l.vt === 'null' ? r : null;
        if (v) return op === '!=' ? { t: [v.name], e: [] } : { t: [], e: [v.name] };
      }
      if (op === '&&') { const a = narrowing(l), b = narrowing(r); return { t: [...a.t, ...b.t], e: [] }; }
      if (op === '||') { const a = narrowing(l), b = narrowing(r); return { t: [], e: [...a.e, ...b.e] }; }
    }
    if (n.kind === 'Unary' && n.op === '!') { const a = narrowing(n.expr); return { t: a.e, e: a.t }; }
    return { t: [], e: [] };
  }
  function narrowScope(scope, names) {
    if (!names.length) return scope;
    const child = new Scope(scope);
    for (const name of names) {
      const s = scope.get(name);
      if (s && s.type.nullable && !s.mutable) child.set(name, { ...s, type: mk(s.type.k) });
    }
    return child;
  }

  // --- expressions
  function val(n, scope) {
    const t = expr(n, scope);
    if (t.k === 'void') { err('E210', 'this call returns no value', n); n.type = ERR; return ERR; }
    return t;
  }
  function expr(n, scope) {
    switch (n.kind) {
      case 'Lit': return (n.type = n.vt === 'null' ? mk('null', true) : mk(n.vt));
      case 'Var': {
        const s = scope.get(n.name);
        if (!s) { err('E201', `unknown name '${n.name}'`, n, fns.has(n.name) ? 'functions cannot be used as values; call it with ()' : null); return (n.type = ERR); }
        return (n.type = s.type);
      }
      case 'Unary': {
        const t = val(n.expr, scope);
        if (isErr(t)) return (n.type = ERR);
        if (t.nullable) { nullErr(n.expr, t); return (n.type = ERR); }
        if (n.op === '-' && isNum(t)) return (n.type = t);
        if (n.op === '!' && t.k === 'bool') return (n.type = t);
        err('E204', `cannot apply '${n.op}' to ${T(t)}`, n);
        return (n.type = ERR);
      }
      case 'Binary': return (n.type = binary(n, scope));
      case 'Call': return call(n, scope);
    }
  }
  function binary(n, scope) {
    const op = n.op;
    if (op === '&&' || op === '||') {
      const lt = val(n.l, scope);
      const nr = narrowing(n.l);
      const rt = val(n.r, narrowScope(scope, op === '&&' ? nr.t : nr.e));
      if (isErr(lt) || isErr(rt)) return ERR;
      for (const [o, t] of [[n.l, lt], [n.r, rt]]) if (t.k !== 'bool' || t.nullable) { mismatch(o, mk('bool'), t, `operand of '${op}'`); return ERR; }
      return mk('bool');
    }
    const lt = val(n.l, scope), rt = val(n.r, scope);
    if (isErr(lt) || isErr(rt)) return ERR;
    if (op === '??') {
      if (lt.k === 'null' || !lt.nullable) { err('E205', `left side of '??' is not nullable (type ${T(lt)})`, n.l, "'??' provides a default for a nullable value such as int?"); return ERR; }
      if (!assignable(mk(lt.k, true), rt)) { mismatch(n.r, mk(lt.k), rt, "default value of '??'"); return ERR; }
      return mk(lt.k, rt.nullable);
    }
    if (op === '==' || op === '!=') {
      if (lt.k === 'null' || rt.k === 'null') {
        const other = lt.k === 'null' ? rt : lt;
        if (other.k !== 'null' && !other.nullable) { err('E205', `cannot compare ${T(other)} with null; ${T(other)} is never null`, n); return ERR; }
        return mk('bool');
      }
      if (lt.k !== rt.k) { err('E204', `cannot compare ${T(lt)} with ${T(rt)}`, n, isNum(lt) && isNum(rt) ? 'Aruna never converts between int and float implicitly' : null); return ERR; }
      return mk('bool');
    }
    for (const [o, t] of [[n.l, lt], [n.r, rt]]) if (t.nullable) { nullErr(o, t); return ERR; }
    const cmp = op === '<' || op === '<=' || op === '>' || op === '>=';
    if (op === '+' && lt.k === 'string' && rt.k === 'string') return mk('string');
    if (isNum(lt) && lt.k === rt.k) {
      if (op === '%' && lt.k !== 'int') { err('E204', "'%' needs int operands", n); return ERR; }
      return cmp ? mk('bool') : mk(lt.k);
    }
    let hint = null;
    if (isNum(lt) && isNum(rt)) hint = 'Aruna never converts between int and float implicitly';
    else if (op === '+' && (lt.k === 'string' || rt.k === 'string')) hint = 'use str(...) to convert a value to string';
    err('E204', `cannot apply '${op}' to ${T(lt)} and ${T(rt)}`, n, hint);
    return ERR;
  }
  function call(n, scope) {
    const bid = builtinIds.get(n.name);
    const sig = bid ? BUILTIN_SIGS[bid] : fns.get(n.name);
    const ats = n.args.map(a => val(a, scope));
    if (!sig) { err('E201', `unknown function '${n.name}'`, n); return (n.type = ERR); }
    if (bid) n.builtin = bid;
    const want = sig.params === null ? 1 : sig.params.length;
    if (ats.length !== want) err('E207', `'${n.name}' takes ${want} argument${want === 1 ? '' : 's'}, found ${ats.length}`, n);
    else if (sig.params) sig.params.forEach((p, k) => { if (!assignable(p, ats[k])) mismatch(n.args[k], p, ats[k], `argument ${k + 1} of '${n.name}'`); });
    return (n.type = sig.ret);
  }

  // --- statements
  const ret1 = s => s.kind === 'Return' || (s.kind === 'While' && s.cond.kind === 'Lit' && s.cond.value === true) || (s.kind === 'If' && s.else && always(s.then.body) && (s.else.kind === 'If' ? ret1(s.else) : always(s.else.body)));
  const always = ss => ss.some(ret1);
  const stmts = (ss, scope, ctx) => ss.forEach(s => stmt(s, scope, ctx));

  function stmt(s, scope, ctx) {
    switch (s.kind) {
      case 'Let': {
        const it = val(s.init, scope);
        let t;
        if (s.annot) { t = typeOf(s.annot); if (!assignable(t, it)) mismatch(s.init, t, it, `cannot initialise '${s.name}'`); }
        else if (it.k === 'null') { err('E208', `cannot infer the type of '${s.name}' from null`, s.init, `give it a type, for example: ${profile.keywords.var} ${s.name}: ${profile.types.int}? = null`); t = ERR; }
        else t = it;
        if (scope.has(s.name)) err('E202', `'${s.name}' is already declared in this scope`, s);
        scope.set(s.name, { name: s.name, type: t, mutable: s.mutable });
        return;
      }
      case 'Assign': {
        const sym = scope.get(s.name);
        const vt = val(s.value, scope);
        if (!sym) { err('E201', `unknown name '${s.name}'`, s); return; }
        if (!sym.mutable) { err('E206', `cannot assign to '${s.name}' because it is immutable`, s, `declare it with '${profile.keywords.var}' to allow changes`); return; }
        if (!assignable(sym.type, vt)) mismatch(s.value, sym.type, vt, `cannot assign to '${s.name}'`);
        return;
      }
      case 'Print': val(s.expr, scope); return;
      case 'If': {
        needBool(s.cond, val(s.cond, scope), 'condition');
        const nr = narrowing(s.cond);
        stmts(s.then.body, new Scope(narrowScope(scope, nr.t)), ctx);
        if (s.else) {
          const es = narrowScope(scope, nr.e);
          if (s.else.kind === 'If') stmt(s.else, es, ctx); else stmts(s.else.body, new Scope(es), ctx);
        }
        return;
      }
      case 'While': {
        needBool(s.cond, val(s.cond, scope), 'condition');
        stmts(s.body.body, new Scope(narrowScope(scope, narrowing(s.cond).t)), ctx);
        return;
      }
      case 'Return': {
        if (!ctx.fn) { err('E209', "'return' is only allowed inside a function", s); return; }
        if (s.expr) {
          const t = val(s.expr, scope);
          if (ctx.fn.ret.k === 'void') err('E209', `function '${ctx.fn.name}' does not declare a return type, so it cannot return a value`, s.expr);
          else if (!assignable(ctx.fn.ret, t)) mismatch(s.expr, ctx.fn.ret, t, `return value of '${ctx.fn.name}'`);
        } else if (ctx.fn.ret.k !== 'void') err('E209', `function '${ctx.fn.name}' must return a value of type ${T(ctx.fn.ret)}`, s);
        return;
      }
      case 'ExprStmt':
        if (s.expr.kind !== 'Call') { err('E210', 'this expression has no effect', s.expr, 'only function calls can be used as statements'); val(s.expr, scope); }
        else expr(s.expr, scope);
        return;
    }
  }

  // --- program: collect function signatures first (functions may be called before they are defined)
  for (const it of program.body) {
    if (it.kind !== 'FnDecl') continue;
    if (builtinIds.has(it.name)) { err('E202', `'${it.name}' is the name of a built-in function`, it); continue; }
    if (fns.has(it.name)) { err('E202', `function '${it.name}' is already defined`, it); continue; }
    const seen = new Set();
    for (const p of it.params) { if (seen.has(p.name)) err('E202', `duplicate parameter '${p.name}'`, p); seen.add(p.name); }
    fns.set(it.name, { node: it, name: it.name, params: it.params.map(p => typeOf(p.type)), ret: it.retType ? typeOf(it.retType) : VOID });
  }
  const top = new Scope();
  for (const it of program.body) {
    if (it.kind !== 'FnDecl') { stmt(it, top, { fn: null }); continue; }
    const sig = fns.get(it.name);
    if (!sig || sig.node !== it) continue;
    const fs = new Scope();                       // functions see their parameters only (no globals in v0.1.0)
    it.params.forEach(p => fs.set(p.name, { name: p.name, type: typeOf(p.type), mutable: false }));
    stmts(it.body.body, fs, { fn: sig });
    if (sig.ret.k !== 'void' && !always(it.body.body)) err('E209', `function '${it.name}' may reach its end without returning a value of type ${T(sig.ret)}`, it);
  }
  return diags;
}
