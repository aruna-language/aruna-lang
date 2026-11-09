import fs from 'node:fs';

export class ArunaRuntimeError extends Error {
  constructor(message, node) {
    super(message);
    this.code = 'E301'; this.line = node?.line ?? 1; this.col = node?.col ?? 1; this.length = node?.len ?? 1; this.hint = null;
  }
}

const MAX_DEPTH = 1000;

class Env {
  constructor(p = null) { this.vars = new Map(); this.p = p; }
  declare(n, v) { this.vars.set(n, v); }
  find(n) { let e = this; while (e && !e.vars.has(n)) e = e.p; return e; }
  get(n) { return this.find(n).vars.get(n); }
  set(n, v) { this.find(n).vars.set(n, v); }
}

/** Reads one line from standard input. Returns null at end of input. */
export function stdinLine() {
  const chunk = Buffer.alloc(1), bytes = [];
  for (;;) {
    let n;
    try { n = fs.readSync(0, chunk, 0, 1, null); }
    catch (e) {
      if (e.code === 'EAGAIN') { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); continue; }
      if (e.code === 'EOF') break;
      throw e;
    }
    if (n === 0) break;
    if (chunk[0] === 10) return Buffer.from(bytes).toString('utf8').replace(/\r$/, '');
    bytes.push(chunk[0]);
  }
  return bytes.length ? Buffer.from(bytes).toString('utf8').replace(/\r$/, '') : null;
}

/** Tree-walking interpreter over the type-annotated AST produced by the checker. */
export function execute(program, io = {}) {
  const write = io.write ?? (s => process.stdout.write(s));
  const readLine = io.readLine ?? stdinLine;
  const fns = new Map();
  for (const it of program.body) if (it.kind === 'FnDecl') fns.set(it.name, it);
  let depth = 0;

  const fmt = (v, t) => v === null ? 'null' : t.k === 'float' && Number.isInteger(v) ? v.toFixed(1) : String(v);
  const intOp = (n, v) => {
    if (n.type.k === 'int' && !Number.isSafeInteger(v)) throw new ArunaRuntimeError('integer overflow', n);
    return v;
  };

  function ev(n, env) {
    switch (n.kind) {
      case 'Lit': return n.value;
      case 'Var': return env.get(n.name);
      case 'Unary': { const v = ev(n.expr, env); return n.op === '-' ? -v : !v; }
      case 'Binary': {
        const op = n.op;
        if (op === '&&') return ev(n.l, env) && ev(n.r, env);
        if (op === '||') return ev(n.l, env) || ev(n.r, env);
        if (op === '??') { const l = ev(n.l, env); return l !== null ? l : ev(n.r, env); }
        const l = ev(n.l, env), r = ev(n.r, env);
        switch (op) {
          case '+': return typeof l === 'string' ? l + r : intOp(n, l + r);
          case '-': return intOp(n, l - r);
          case '*': return intOp(n, l * r);
          case '/':
            if (r === 0) throw new ArunaRuntimeError('division by zero', n);
            return n.type.k === 'int' ? Math.trunc(l / r) : l / r;
          case '%':
            if (r === 0) throw new ArunaRuntimeError('division by zero', n);
            return l % r;
          case '<': return l < r;
          case '<=': return l <= r;
          case '>': return l > r;
          case '>=': return l >= r;
          case '==': return l === r;
          case '!=': return l !== r;
        }
        return undefined;
      }
      case 'Call': {
        const args = n.args.map(a => ev(a, env));
        if (n.builtin) {
          switch (n.builtin) {
            case 'str': return fmt(args[0], n.args[0].type);
            case 'len': return [...args[0]].length;
            case 'toInt': {
              const s = args[0].trim();
              if (!/^[+-]?\d+$/.test(s)) return null;
              const v = Number(s);
              return Number.isSafeInteger(v) ? v : null;
            }
            case 'readLine': return readLine();
          }
        }
        if (++depth > MAX_DEPTH) throw new ArunaRuntimeError(`call stack limit exceeded (maximum depth ${MAX_DEPTH})`, n);
        const f = fns.get(n.name), e = new Env();
        f.params.forEach((p, k) => e.declare(p.name, args[k]));
        const r = run(f.body.body, e);
        depth--;
        return r ? r.v : undefined;
      }
    }
    return undefined;
  }

  function run(stmts, env) {
    for (const s of stmts) { const r = ex(s, env); if (r) return r; }
    return undefined;
  }

  function ex(s, env) {
    switch (s.kind) {
      case 'Let': env.declare(s.name, ev(s.init, env)); return undefined;
      case 'Assign': env.set(s.name, ev(s.value, env)); return undefined;
      case 'Print': write(fmt(ev(s.expr, env), s.expr.type) + '\n'); return undefined;
      case 'If':
        if (ev(s.cond, env)) return run(s.then.body, new Env(env));
        if (s.else) return s.else.kind === 'If' ? ex(s.else, env) : run(s.else.body, new Env(env));
        return undefined;
      case 'While':
        while (ev(s.cond, env)) { const r = run(s.body.body, new Env(env)); if (r) return r; }
        return undefined;
      case 'Return': return { v: s.expr ? ev(s.expr, env) : undefined };
      case 'ExprStmt': ev(s.expr, env); return undefined;
    }
    return undefined;
  }

  try { run(program.body, new Env()); }
  catch (e) {
    if (e instanceof RangeError) throw new ArunaRuntimeError('stack overflow', program.body[0]);
    throw e;
  }
}
