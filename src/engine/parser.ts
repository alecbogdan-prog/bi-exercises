import { DaxError } from './model';

export type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'call'; name: string; args: Node[] }
  | { k: 'table'; name: string }
  | { k: 'col'; table: string; col: string }
  | { k: 'bracket'; name: string }
  | { k: 'bin'; op: string; l: Node; r: Node }
  | { k: 'neg'; e: Node }
  | { k: 'list'; items: Node[] }
  | { k: 'var'; defs: { name: string; value: Node }[]; body: Node };

type TokType = 'num' | 'str' | 'qtable' | 'bracket' | 'ident' | 'op' | 'eof';
interface Tok {
  t: TokType;
  v: string;
  pos: number;
}

const OPS = ['<=', '>=', '<>', '==', '&&', '||', '=', '<', '>', '+', '-', '*', '/', '&', '^', '(', ')', ',', '{', '}'];

export function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if ((c === '/' && src[i + 1] === '/') || (c === '-' && src[i + 1] === '-')) {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/.exec(src.slice(i))!;
      toks.push({ t: 'num', v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            s += '"';
            j += 2;
            continue;
          }
          break;
        }
        s += src[j++];
      }
      if (j >= src.length) throw new DaxError(`Unterminated text string starting at position ${i + 1}.`);
      toks.push({ t: 'str', v: s, pos: i });
      i = j + 1;
      continue;
    }
    if (c === "'") {
      const end = src.indexOf("'", i + 1);
      if (end === -1) throw new DaxError(`Missing closing ' for table name at position ${i + 1}.`);
      toks.push({ t: 'qtable', v: src.slice(i + 1, end), pos: i });
      i = end + 1;
      continue;
    }
    if (c === '[') {
      const end = src.indexOf(']', i + 1);
      if (end === -1) throw new DaxError(`Missing closing ] at position ${i + 1}.`);
      toks.push({ t: 'bracket', v: src.slice(i + 1, end).trim(), pos: i });
      i = end + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))!;
      toks.push({ t: 'ident', v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      toks.push({ t: 'op', v: op, pos: i });
      i += op.length;
      continue;
    }
    throw new DaxError(`Unexpected character "${c}" at position ${i + 1}.`);
  }
  toks.push({ t: 'eof', v: '', pos: src.length });
  return toks;
}

class Parser {
  private p = 0;
  private toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }
  private peek(): Tok {
    return this.toks[this.p];
  }
  private next(): Tok {
    return this.toks[this.p++];
  }
  private isOp(v: string): boolean {
    const t = this.peek();
    return t.t === 'op' && t.v === v;
  }
  private expectOp(v: string): void {
    const t = this.next();
    if (t.t !== 'op' || t.v !== v) {
      throw new DaxError(
        t.t === 'eof'
          ? `The expression ended unexpectedly. Expected "${v}".`
          : `Expected "${v}" but found "${t.v}" at position ${t.pos + 1}.`,
      );
    }
  }

  parse(): Node {
    const n = this.or();
    const t = this.peek();
    if (t.t !== 'eof') throw new DaxError(`Unexpected "${t.v}" at position ${t.pos + 1}.`);
    return n;
  }

  private or(): Node {
    let l = this.and();
    while (this.isOp('||')) {
      this.next();
      l = { k: 'bin', op: '||', l, r: this.and() };
    }
    return l;
  }
  private and(): Node {
    let l = this.cmp();
    while (this.isOp('&&')) {
      this.next();
      l = { k: 'bin', op: '&&', l, r: this.cmp() };
    }
    return l;
  }
  private cmp(): Node {
    let l = this.concat();
    for (;;) {
      const t = this.peek();
      if (t.t === 'op' && ['=', '==', '<>', '<', '>', '<=', '>='].includes(t.v)) {
        this.next();
        l = { k: 'bin', op: t.v === '==' ? '=' : t.v, l, r: this.concat() };
      } else if (t.t === 'ident' && t.v.toUpperCase() === 'IN') {
        this.next();
        l = { k: 'bin', op: 'IN', l, r: this.concat() };
      } else return l;
    }
  }
  private concat(): Node {
    let l = this.add();
    while (this.isOp('&')) {
      this.next();
      l = { k: 'bin', op: '&', l, r: this.add() };
    }
    return l;
  }
  private add(): Node {
    let l = this.mul();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next().v;
      l = { k: 'bin', op, l, r: this.mul() };
    }
    return l;
  }
  private mul(): Node {
    let l = this.unary();
    while (this.isOp('*') || this.isOp('/')) {
      const op = this.next().v;
      l = { k: 'bin', op, l, r: this.unary() };
    }
    return l;
  }
  private unary(): Node {
    if (this.isOp('-')) {
      this.next();
      return { k: 'neg', e: this.unary() };
    }
    if (this.isOp('+')) {
      this.next();
      return this.unary();
    }
    return this.pow();
  }
  private pow(): Node {
    const l = this.primary();
    if (this.isOp('^')) {
      this.next();
      return { k: 'bin', op: '^', l, r: this.unary() };
    }
    return l;
  }
  private primary(): Node {
    const t = this.next();
    switch (t.t) {
      case 'num':
        return { k: 'num', v: Number(t.v) };
      case 'str':
        return { k: 'str', v: t.v };
      case 'bracket':
        return { k: 'bracket', name: t.v };
      case 'qtable':
        return this.tableOrColumn(t.v);
      case 'ident': {
        if (this.isOp('(')) {
          this.next();
          const args: Node[] = [];
          if (!this.isOp(')')) {
            for (;;) {
              // Empty arguments are allowed (e.g. RANKX(t, e, , DESC)).
              args.push(this.isOp(',') || this.isOp(')') ? { k: 'call', name: '__EMPTY', args: [] } : this.or());
              if (this.isOp(',')) {
                this.next();
                continue;
              }
              break;
            }
          }
          this.expectOp(')');
          return { k: 'call', name: t.v.toUpperCase(), args };
        }
        const up = t.v.toUpperCase();
        if (up === 'TRUE' || up === 'FALSE') return { k: 'call', name: up, args: [] };
        if (up === 'VAR') return this.varBlock();
        if (up === 'RETURN') throw new DaxError(`RETURN at position ${t.pos + 1} has no matching VAR.`);
        return this.tableOrColumn(t.v);
      }
      case 'op':
        if (t.v === '(') {
          const e = this.or();
          this.expectOp(')');
          return e;
        }
        if (t.v === '{') {
          const items: Node[] = [];
          if (!this.isOp('}')) {
            for (;;) {
              items.push(this.or());
              if (this.isOp(',')) {
                this.next();
                continue;
              }
              break;
            }
          }
          this.expectOp('}');
          return { k: 'list', items };
        }
        throw new DaxError(`Unexpected "${t.v}" at position ${t.pos + 1}.`);
      case 'eof':
        throw new DaxError('The expression ended unexpectedly.');
    }
  }
  /** VAR a = expr [VAR b = expr ...] RETURN expr  (the leading VAR is already consumed). */
  private varBlock(): Node {
    const defs: { name: string; value: Node }[] = [];
    for (;;) {
      const nameTok = this.next();
      if (nameTok.t !== 'ident') throw new DaxError(`A variable name is expected after VAR at position ${nameTok.pos + 1}.`);
      if (['VAR', 'RETURN'].includes(nameTok.v.toUpperCase())) throw new DaxError(`"${nameTok.v}" cannot be used as a variable name.`);
      this.expectOp('=');
      defs.push({ name: nameTok.v, value: this.or() });
      const t = this.peek();
      if (t.t === 'ident' && t.v.toUpperCase() === 'VAR') {
        this.next();
        continue;
      }
      if (t.t === 'ident' && t.v.toUpperCase() === 'RETURN') {
        this.next();
        break;
      }
      throw new DaxError(t.t === 'eof' ? 'A VAR block must end with RETURN <expression>.' : `Expected VAR or RETURN but found "${t.v}" at position ${t.pos + 1}.`);
    }
    return { k: 'var', defs, body: this.or() };
  }

  private tableOrColumn(name: string): Node {
    const t = this.peek();
    if (t.t === 'bracket') {
      this.next();
      return { k: 'col', table: name, col: t.v };
    }
    return { k: 'table', name };
  }
}

export function parseDax(src: string): Node {
  if (!src.trim()) throw new DaxError('The expression is empty.');
  return new Parser(tokenize(src)).parse();
}

/** Splits "Measure Name = expression" into its two parts. */
export function splitMeasureDefinition(src: string): { name: string; expression: string } {
  const idx = src.indexOf('=');
  if (idx === -1) throw new DaxError('A measure must look like: Measure Name = <expression>');
  const name = src.slice(0, idx).trim().replace(/^\[|\]$/g, '').trim();
  const expression = src.slice(idx + 1).trim();
  if (!name) throw new DaxError('The measure needs a name before the "=" sign.');
  if (/[[\]]/.test(name)) throw new DaxError('Measure names cannot contain [ or ].');
  if (!expression) throw new DaxError('The measure needs an expression after the "=" sign.');
  return { name, expression };
}

/** Collects all function names used in an expression (upper case). */
export function functionsUsed(n: Node, out = new Set<string>()): Set<string> {
  switch (n.k) {
    case 'call':
      out.add(n.name);
      n.args.forEach((a) => functionsUsed(a, out));
      break;
    case 'bin':
      functionsUsed(n.l, out);
      functionsUsed(n.r, out);
      break;
    case 'neg':
      functionsUsed(n.e, out);
      break;
    case 'list':
      n.items.forEach((a) => functionsUsed(a, out));
      break;
    case 'var':
      out.add('VAR');
      n.defs.forEach((d) => functionsUsed(d.value, out));
      functionsUsed(n.body, out);
      break;
  }
  return out;
}
