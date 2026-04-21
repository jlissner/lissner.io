import { normalizePersonHandle, normalizeTagToken } from "./search-query-normalize.js";

export type SearchQueryAst =
  | { kind: "legacy"; text: string }
  | { kind: "and"; left: SearchQueryAst; right: SearchQueryAst }
  | { kind: "or"; left: SearchQueryAst; right: SearchQueryAst }
  | { kind: "tag"; tag: string }
  | { kind: "person"; handle: string }
  | { kind: "text"; text: string };

type RawToken =
  | { kind: "LPAREN" }
  | { kind: "RPAREN" }
  | { kind: "AND" }
  | { kind: "OR" }
  | { kind: "TAG"; value: string }
  | { kind: "AT"; value: string }
  | { kind: "WORD"; value: string };

export type ParseSearchQueryResult =
  | { ok: true; ast: SearchQueryAst }
  | { ok: false; message: string };

function isWhitespace(c: string): boolean {
  return /\s/.test(c);
}

function readIdent(s: string, start: number): { ident: string; end: number } {
  let i = start;
  let out = "";
  while (i < s.length) {
    const c = s[i];
    if (/[a-zA-Z0-9_]/.test(c)) {
      out += c;
      i += 1;
      continue;
    }
    break;
  }
  return { ident: out, end: i };
}

function readWord(s: string, start: number): { word: string; end: number } {
  let i = start;
  let out = "";
  while (i < s.length) {
    const c = s[i];
    if (isWhitespace(c) || c === "(" || c === ")" || c === "#" || c === "@") break;
    out += c;
    i += 1;
  }
  return { word: out, end: i };
}

/** True when the string should use the legacy embedding path (full query, substring people). */
export function isLegacyQueryString(q: string): boolean {
  const t = q.trim();
  if (!t) return false;
  if (/[#@]/.test(t)) return false;
  if (/\(.*\)/.test(t)) return false;
  if (/\bAND\b/i.test(t)) return false;
  if (/\bOR\b/i.test(t)) return false;
  return true;
}

function tokenize(s: string): RawToken[] {
  const tokens: RawToken[] = [];
  let i = 0;
  while (i < s.length) {
    if (isWhitespace(s[i])) {
      i += 1;
      continue;
    }
    const c = s[i];
    if (c === "(") {
      tokens.push({ kind: "LPAREN" });
      i += 1;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "RPAREN" });
      i += 1;
      continue;
    }
    if (c === "#") {
      const { ident, end } = readIdent(s, i + 1);
      if (!ident.length) {
        throw new Error("Expected tag after #");
      }
      tokens.push({ kind: "TAG", value: normalizeTagToken(`#${ident}`) });
      i = end;
      continue;
    }
    if (c === "@") {
      const { ident, end } = readIdent(s, i + 1);
      if (!ident.length) {
        throw new Error("Expected name after @");
      }
      const handle = normalizePersonHandle(ident);
      if (!handle.length) {
        throw new Error("Invalid @ handle");
      }
      tokens.push({ kind: "AT", value: handle });
      i = end;
      continue;
    }
    const { word, end } = readWord(s, i);
    if (!word.length) {
      throw new Error("Unexpected character in search query");
    }
    const upper = word.toUpperCase();
    if (upper === "AND") {
      tokens.push({ kind: "AND" });
    } else if (upper === "OR") {
      tokens.push({ kind: "OR" });
    } else {
      tokens.push({ kind: "WORD", value: word });
    }
    i = end;
  }
  return mergeWordRuns(tokens);
}

function mergeWordRuns(tokens: RawToken[]): RawToken[] {
  const out: RawToken[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length === 0) return;
    out.push({ kind: "WORD", value: buf.join(" ") });
    buf = [];
  };
  for (const t of tokens) {
    if (t.kind === "WORD") {
      buf.push(t.value);
      continue;
    }
    flush();
    out.push(t);
  }
  flush();
  return out;
}

class ParserState {
  readonly tokens: RawToken[];

  index = 0;

  constructor(tokens: RawToken[]) {
    this.tokens = tokens;
  }

  peek(): RawToken | undefined {
    return this.tokens[this.index];
  }

  consume(): RawToken | undefined {
    const t = this.tokens[this.index];
    this.index += 1;
    return t;
  }
}

function parseOr(state: ParserState): SearchQueryAst {
  let left = parseAnd(state);
  while (state.peek()?.kind === "OR") {
    state.consume();
    const right = parseAnd(state);
    left = { kind: "or", left, right };
  }
  return left;
}

function parseAnd(state: ParserState): SearchQueryAst {
  let left = parsePrimary(state);
  while (state.peek()?.kind === "AND") {
    state.consume();
    const right = parsePrimary(state);
    left = { kind: "and", left, right };
  }
  return left;
}

function parsePrimary(state: ParserState): SearchQueryAst {
  const t = state.peek();
  if (!t) {
    throw new Error("Unexpected end of query");
  }
  if (t.kind === "LPAREN") {
    state.consume();
    const inner = parseOr(state);
    const close = state.consume();
    if (!close || close.kind !== "RPAREN") {
      throw new Error("Missing )");
    }
    return inner;
  }
  if (t.kind === "TAG") {
    state.consume();
    return { kind: "tag", tag: t.value };
  }
  if (t.kind === "AT") {
    state.consume();
    return { kind: "person", handle: t.value };
  }
  if (t.kind === "WORD") {
    state.consume();
    return { kind: "text", text: t.value.trim() };
  }
  throw new Error(`Unexpected ${t.kind} in search query`);
}

export function parseStructuredSearchQuery(q: string): ParseSearchQueryResult {
  const trimmed = q.trim();
  if (!trimmed) {
    return { ok: false, message: "Empty search query" };
  }
  try {
    const raw = tokenize(trimmed);
    if (raw.length === 0) {
      return { ok: false, message: "Empty search query" };
    }
    const state = new ParserState(raw);
    const ast = parseOr(state);
    if (state.peek()) {
      return { ok: false, message: "Unexpected text after expression" };
    }
    return { ok: true, ast };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid search query";
    return { ok: false, message };
  }
}

export function parseSearchQuery(q: string): ParseSearchQueryResult {
  const trimmed = q.trim();
  if (!trimmed) {
    return { ok: false, message: "Empty search query" };
  }
  if (isLegacyQueryString(trimmed)) {
    return { ok: true, ast: { kind: "legacy", text: trimmed } };
  }
  return parseStructuredSearchQuery(trimmed);
}
