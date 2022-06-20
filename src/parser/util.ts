export interface Span {
  source: string;
  start: number;
  end: number;
}

export function getSpanPos(span: Span, source: string): [number, number] {
  let col = 0;
  let row = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (i === span.start) {
      break;
    }
    if (ch === "\n") {
      row += 1;
      col = 0;
    } else {
      col += 1;
    }
  }
  return [row, col];
}

export interface SpanData<T> {
  span: Span;
  data: T;
}

export class ParseError extends Error {
  public span: Span;
  public specificity: number;

  constructor(span: Span, specificity: number, message: string) {
    super(message);
    this.span = span;
    this.specificity = specificity;
  }
}

export function tryElse<T>(body: () => T, otherwise: T): T {
  try {
    return body();
  } catch (_) {
    return otherwise;
  }
}

export function filterComments(source: string): string {
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "/") {
      // Check for comment
      const next = source[i + 1];
      if (next === "/") {
        // Skip line comment
        i += 1;
        for (; i < source.length; i++) {
          if (source[i] === "\n") {
            i -= 1;
            break;
          }
        }
        continue;
      } else if (next === "*") {
        // Skip block comment
        i += 1;
        for (; i < source.length; i++) {
          if (source[i] === "*" && source[i + 1] === "/") {
            i += 1;
            break;
          }
        }
        continue;
      }
    }
    out += ch;
  }
  return out;
}
