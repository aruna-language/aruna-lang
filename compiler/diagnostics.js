export class ArunaError extends Error {
  constructor(code, message, line, col, length = 1, hint = null) {
    super(message);
    this.code = code; this.line = line; this.col = col; this.length = length; this.hint = hint;
  }
}

export function format(d, source, filename = '<input>') {
  const text = (source.split('\n')[d.line - 1] ?? '').replace(/\r$/, '');
  const pad = ' '.repeat(String(d.line).length);
  let out = `error[${d.code}]: ${d.message}\n${pad}--> ${filename}:${d.line}:${d.col}\n${pad} |\n${d.line} | ${text}\n` +
    `${pad} | ${' '.repeat(Math.max(0, d.col - 1))}${'^'.repeat(Math.max(1, d.length))}`;
  if (d.hint) out += `\n${pad} = help: ${d.hint}`;
  return out;
}
