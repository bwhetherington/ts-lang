import { filterComments, SpanData } from "./util";

export enum TokenKind {
  Number = "Number",
  String = "String",
  Identifier = "Identifier",
  OpenParen = "OpenParen",
  CloseParen = "CloseParen",
  OpenBracket = "OpenBracket",
  CloseBracket = "CloseBracket",
  OpenBrace = "OpenBrace",
  CloseBrace = "CloseBrace",
  Assign = "Assign",
  Equals = "Equals",
  NotEquals = "NotEquals",
  Greater = "Greater",
  GreaterEqual = "GreaterEqual",
  Less = "Less",
  LessEqual = "LessEqual",
  Plus = "Plus",
  Minus = "Minus",
  Times = "Times",
  Divide = "Divide",
  Modulo = "Modulo",
  Raise = "Raise",
  Colon = "Colon",
  PlusAssign = "PlusAssign",
  MinusAssign = "MinusAssign",
  TimesAssign = "TimesAssign",
  DivideAssign = "DivideAssign",
  ModuloAssign = "ModuloAssign",
  RaiseAssign = "RaiseAssign",
  Let = "Let",
  func = "func",
  Class = "Class",
  Dot = "Dot",
  Spread = "Spread",
  Comma = "Comma",
  And = "And",
  Or = "Or",
  Pub = "Pub",
  Arrow = "Arrow",
  Break = "Break",
  Return = "Return",
  Continue = "Continue",
  Loop = "Loop",
  While = "While",
  For = "For",
  In = "In",
  If = "If",
  Else = "Else",
  True = "True",
  False = "False",
  None = "None",
  Whitespace = "Whitespace",
  New = "New",
  Comment = "Comment",
  Question = "Question",
  Exclamation = "Exclamation",
}

type TokenData =
  | {
      kind: TokenKind.Comment;
      value: string;
    }
  | {
      kind: TokenKind.Number;
      value: number;
    }
  | {
      kind: TokenKind.String;
      value: string;
    }
  | {
      kind: TokenKind.Identifier;
      value: string;
    }
  | {
      // (
      kind: TokenKind.OpenParen;
    }
  | {
      // )
      kind: TokenKind.CloseParen;
    }
  | {
      // [
      kind: TokenKind.OpenBracket;
    }
  | {
      // ]
      kind: TokenKind.CloseBracket;
    }
  | {
      // {
      kind: TokenKind.OpenBrace;
    }
  | {
      // }
      kind: TokenKind.CloseBrace;
    }
  | {
      // =
      kind: TokenKind.Assign;
    }
  | {
      // ==
      kind: TokenKind.Equals;
    }
  | {
      // !=
      kind: TokenKind.NotEquals;
    }
  | {
      // >
      kind: TokenKind.Greater;
    }
  | {
      // >=
      kind: TokenKind.GreaterEqual;
    }
  | {
      // <
      kind: TokenKind.Less;
    }
  | {
      // <=
      kind: TokenKind.LessEqual;
    }
  | {
      // +
      kind: TokenKind.Plus;
    }
  | {
      // -
      kind: TokenKind.Minus;
    }
  | {
      // *
      kind: TokenKind.Times;
    }
  | {
      // /
      kind: TokenKind.Divide;
    }
  | {
      // %
      kind: TokenKind.Modulo;
    }
  | {
      // ^
      kind: TokenKind.Raise;
    }
  | {
      // +=
      kind: TokenKind.PlusAssign;
    }
  | {
      // -=
      kind: TokenKind.MinusAssign;
    }
  | {
      // *=
      kind: TokenKind.TimesAssign;
    }
  | {
      // /=
      kind: TokenKind.DivideAssign;
    }
  | {
      // %=
      kind: TokenKind.ModuloAssign;
    }
  | {
      // ^=
      kind: TokenKind.RaiseAssign;
    }
  | {
      // let
      kind: TokenKind.Let;
    }
  | {
      // func
      kind: TokenKind.func;
    }
  | {
      // class
      kind: TokenKind.Class;
    }
  | {
      // .
      kind: TokenKind.Dot;
    }
  | {
      // ...
      kind: TokenKind.Spread;
    }
  | {
      // ,
      kind: TokenKind.Comma;
    }
  | {
      // &&
      kind: TokenKind.And;
    }
  | {
      // ||
      kind: TokenKind.Or;
    }
  | {
      // pub
      kind: TokenKind.Pub;
    }
  | {
      // break
      kind: TokenKind.Break;
    }
  | {
      // continue
      kind: TokenKind.Continue;
    }
  | {
      // loop
      kind: TokenKind.Loop;
    }
  | {
      // while
      kind: TokenKind.While;
    }
  | {
      // for
      kind: TokenKind.For;
    }
  | {
      // in
      kind: TokenKind.In;
    }
  | {
      // if
      kind: TokenKind.If;
    }
  | {
      // else
      kind: TokenKind.Else;
    }
  | {
      // return
      kind: TokenKind.Return;
    }
  | {
      // =>
      kind: TokenKind.Arrow;
    }
  | {
      // True
      kind: TokenKind.True;
    }
  | {
      // False
      kind: TokenKind.False;
    }
  | {
      // None
      kind: TokenKind.None;
    }
  | {
      // :
      kind: TokenKind.Colon;
    }
  | {
      // new
      kind: TokenKind.New;
    }
  | {
      // Whitespace
      kind: TokenKind.Whitespace;
      isNewline: boolean;
    }
  | {
      kind: TokenKind.Question;
    };

export type Token = SpanData<TokenData>;

const WHITESPACE_REGEX = /[\s;]/;

const NUMBER_REGEX = /[0-9]+(\.[0-9]+)?/;

const IDENTIFIER_REGEX = /[\w_\$]+/;

const SYMBOL_REGEX = /[\[\]\(\)\{\}\+\-\*\/\^\=\!\.\,\;\?\$\&\n\r\>\<\:\|\%]/m;

const BREAK_REGEX = /\b/;

function createSymbolTokens(
  mapping: Record<string, TokenKind>
): Record<string, TokenData> {
  return Object.entries(mapping).reduce((acc, [key, val]) => {
    acc[key] = { kind: val } as TokenData;
    return acc;
  }, {} as Record<string, TokenData>);
}

class PrefixNode<T> {
  private children: Record<string, PrefixNode<T>> = {};
  constructor(private prefix: string, public value?: T) {}

  public setChild(prefix: string, value?: T): PrefixNode<T> {
    const node = new PrefixNode(prefix, value);
    this.children[prefix] = node;
    return node;
  }

  public setValue(value: T) {
    this.value = value;
  }

  public find(
    prefix: string,
    prior: string = ""
  ): [string, PrefixNode<T>] | undefined {
    if (prefix.length === 0 || Object.entries(this.children).length === 0) {
      return [prior, this];
    } else {
      const child = this.children[prefix[0]];
      if (child === undefined && this.value) {
        return [prior, this];
      }
      const remainder = prefix.slice(1);
      return child?.find(remainder, prior + this.prefix);
    }
  }

  public findNodeOrCreate(prefix: string): PrefixNode<T> {
    if (prefix.length === 0) {
      return this;
    } else {
      let child = this.children[prefix[0]];
      if (child === undefined) {
        child = this.setChild(prefix[0]);
      }
      const remainder = prefix.slice(1);
      return child.findNodeOrCreate(remainder);
    }
  }
}

class PrefixTree<T> {
  private root: PrefixNode<T> = new PrefixNode("");

  constructor(items: Record<string, T>) {
    for (const [key, value] of Object.entries(items)) {
      this.insertItem(key, value);
    }
  }

  public insertItem(key: string, value: T) {
    const node = this.root.findNodeOrCreate(key);
    node.setValue(value);
  }

  public find(prefix: string): [string, T] | undefined {
    const res = this.root.find(prefix);
    if (res === undefined) {
      return;
    }

    const [key, node] = res;
    if (node.value === undefined) {
      return;
    }

    return [key, node.value];
  }
}

const SYMBOL_TREE = new PrefixTree(
  createSymbolTokens({
    "(": TokenKind.OpenParen,
    ")": TokenKind.CloseParen,
    "[": TokenKind.OpenBracket,
    "]": TokenKind.CloseBracket,
    "{": TokenKind.OpenBrace,
    "}": TokenKind.CloseBrace,
    "=": TokenKind.Assign,
    "==": TokenKind.Equals,
    "!=": TokenKind.NotEquals,
    ">": TokenKind.Greater,
    ">=": TokenKind.GreaterEqual,
    "<": TokenKind.Less,
    "<=": TokenKind.LessEqual,
    "+": TokenKind.Plus,
    "+=": TokenKind.PlusAssign,
    "-": TokenKind.Minus,
    "-=": TokenKind.MinusAssign,
    "*": TokenKind.Times,
    "*=": TokenKind.TimesAssign,
    "/": TokenKind.Divide,
    "/=": TokenKind.DivideAssign,
    "^": TokenKind.Raise,
    "^=": TokenKind.RaiseAssign,
    "%": TokenKind.Modulo,
    "%=": TokenKind.ModuloAssign,
    ".": TokenKind.Dot,
    "?": TokenKind.Question,
    "!": TokenKind.Exclamation,
    "...": TokenKind.Spread,
    ",": TokenKind.Comma,
    "&&": TokenKind.And,
    "||": TokenKind.Or,
    "=>": TokenKind.Arrow,
    ":": TokenKind.Colon,
  })
);

const WORD_SYMBOLS = createSymbolTokens({
  let: TokenKind.Let,
  func: TokenKind.func,
  class: TokenKind.Class,
  pub: TokenKind.Pub,
  if: TokenKind.If,
  else: TokenKind.Else,
  break: TokenKind.Break,
  continue: TokenKind.Continue,
  loop: TokenKind.Loop,
  while: TokenKind.While,
  for: TokenKind.For,
  in: TokenKind.In,
  return: TokenKind.Return,
  True: TokenKind.True,
  False: TokenKind.False,
  None: TokenKind.None,
  new: TokenKind.New,
});

export class Lexer {
  private index: number = 0;

  constructor(private name: string, private source: string) {}

  private peekChar(): string | undefined {
    if (this.index < this.source.length) {
      const char = this.source[this.index];
      return char;
    }
  }

  private nextChar(): string | undefined {
    if (this.index < this.source.length) {
      const char = this.source[this.index];
      this.index += 1;
      return char;
    }
  }

  private readWord(): string {
    let out = "";
    for (
      let char = this.nextChar();
      char !== undefined;
      char = this.nextChar()
    ) {
      if (!BREAK_REGEX.test(char)) {
        this.index -= 1;
        break;
      } else {
        out += char;
      }
    }
    return out;
  }

  public readSymbol(): string {
    let out = "";
    for (
      let char = this.nextChar();
      char !== undefined;
      char = this.nextChar()
    ) {
      if (!SYMBOL_REGEX.test(char)) {
        this.index -= 1;
        break;
      } else {
        out += char;
      }
    }
    return out;
  }

  private tryNextWhitespace(): Token {
    const start = this.index;
    let out = "";
    for (
      let char = this.nextChar();
      char !== undefined;
      char = this.nextChar()
    ) {
      if (char === "/") {
        char = this.nextChar();
        if (char === "/") {
          out += this.tryFinishLineComment().data + "\n";
        } else if (char === "*") {
          out += this.tryFinishBlockComment().data + "*/";
        } else {
          this.index -= 2;
          break;
        }
      } else if (!WHITESPACE_REGEX.test(char)) {
        this.index -= 1;
        break;
      } else {
        out += char;
      }
    }

    if (this.index === start) {
      throw new Error("0 length whitespace");
    }

    const isNewline = out.includes("\n") || out.includes(";");
    return this.createToken(start, this.index, {
      kind: TokenKind.Whitespace,
      isNewline,
    });
  }

  private tryComment(): Token {
    const start = this.index;
    try {
      const ch = this.nextChar();
      if (ch === "/") {
        console.log("start comment");
        const next = this.nextChar();
        if (next === "/") {
          return this.tryFinishLineComment();
        }
        if (next === "*") {
          console.log("block comment");
          return this.tryFinishBlockComment();
        }
        this.index = start;
        throw new Error("could not read comment");
      }
    } catch (ex) {
      this.index = start;
      throw ex;
    }
    this.index = start;
    throw new Error("could not read comment");
  }

  private tryFinishLineComment(): Token {
    const start = this.index;
    while (this.index < this.source.length) {
      const ch = this.nextChar();
      if (ch === "'") {
        // If we've escaped, then ignore the next char
        this.nextChar();
      }
      if (ch === "\n") {
        this.index -= 1;
        const content = this.source.slice(start, this.index);
        return this.createToken(start - 2, this.index, {
          kind: TokenKind.Comment,
          value: content,
        });
      }
    }
    const content = this.source.slice(start).trim();
    return this.createToken(start - 2, this.index, {
      kind: TokenKind.Comment,
      value: content,
    });
  }

  private tryFinishBlockComment(): Token {
    const start = this.index;
    for (; this.index < this.source.length; this.index++) {
      const ch = this.source[this.index];
      if (ch === "'") {
        continue;
      }
      if (ch === "*" && this.source[this.index + 1] === "/") {
        this.index += 2;
        return this.createToken(start - 2, this.index + 1, {
          kind: TokenKind.Comment,
          value: this.source.slice(start, this.index - 2).trim(),
        });
      }
    }
    throw new Error("unclosed block comment");
  }

  private tryNextNumber(): Token {
    const start = this.index;
    const str = this.readWord();
    const end = this.index;

    if (!NUMBER_REGEX.test(str)) {
      // Rewind
      this.index = start;
      throw new Error(`${str} is not a valid number`);
    }

    return this.createToken(start, end, {
      kind: TokenKind.Number,
      value: parseFloat(str),
    });
  }

  private tryNextIdentifier(): Token {
    const start = this.index;
    const str = this.readWord();
    const end = this.index;

    if (!IDENTIFIER_REGEX.test(str)) {
      // Rewind
      this.index = start;
      throw new Error(`${str} is not a valid identifier`);
    }

    return this.createToken(start, end, {
      kind: TokenKind.Identifier,
      value: str,
    });
  }

  private tryNextString(): Token {
    const start = this.index;
    try {
      const begin = this.nextChar();
      if (begin === '"') {
        // Read until we reach a closing quote
        let str = "";
        while (true) {
          const ch = this.nextChar();
          if (ch === '"') {
            return this.createToken(start, this.index, {
              kind: TokenKind.String,
              value: str,
            });
          } else {
            str += ch;
          }
        }
      }
    } catch (ex) {
      // Failed to parse a string
      // Rewind
      this.index = start;
      throw ex;
    }

    // Failed to parse a string
    // Rewind
    this.index = start;
    throw new Error("unterminated string");
  }

  private trySymbolToken(): Token {
    const start = this.index;
    try {
      const symbol = this.readSymbol();
      const res = SYMBOL_TREE.find(symbol);

      if (res === undefined) {
        this.index = start;
        throw new Error(`unknown symbol: ${symbol}`);
      }

      const [key, value] = res;
      const end = start + key.length + 1;
      this.index = end;

      return this.createToken(start, end, value);
    } catch (ex) {
      this.index = start;
      throw ex;
    }
  }

  private tryWordSymbolToken(): Token {
    const start = this.index;
    const word = this.readWord();

    const res = WORD_SYMBOLS[word];
    if (!res) {
      this.index = start;
      throw new Error(`unknown symbol: ${word}`);
    }

    return this.createToken(start, this.index, res);
  }

  private tryTokens(tokenReaders: (() => Token)[]): Token {
    let lastError = undefined;
    for (const reader of tokenReaders) {
      try {
        const res = reader();
        return res;
      } catch (ex) {
        lastError = ex;
      }
    }
    throw lastError;
  }

  private createToken(start: number, end: number, data: TokenData): Token {
    return {
      span: {
        source: this.name,
        start,
        end,
      },
      data,
    };
  }

  public nextToken(): Token {
    const char = this.peekChar();
    if (char === undefined) {
      throw new Error("unexpected EOF");
    }

    return this.tryTokens([
      // this.tryComment.bind(this),
      this.tryNextWhitespace.bind(this),
      this.trySymbolToken.bind(this),
      this.tryWordSymbolToken.bind(this),
      this.tryNextNumber.bind(this),
      this.tryNextString.bind(this),
      this.tryNextIdentifier.bind(this),
    ]);
  }

  public *readTokens(): Iterable<Token> {
    while (this.index < this.source.length) {
      try {
        const token = this.nextToken();
        yield token;
      } catch (ex) {
        return;
      }
    }
  }
}
