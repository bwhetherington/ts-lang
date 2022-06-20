import { Lexer, Token, TokenKind } from "./lexer";
import { ParseError, Span, SpanData } from "./util";

export enum StatementKind {
  Declaration = "Declaration",
  Assignment = "Assignment",
  Expression = "Expression",
  If = "If",
  Loop = "Loop",
  Break = "Break",
  Continue = "Continue",
  Return = "Return",
  Block = "Block",
}

type StatementData =
  | {
      kind: StatementKind.Declaration;
      value: {
        name: string;
        isPublic: boolean;
        value: Expression;
      };
    }
  | {
      kind: StatementKind.Assignment;
      value: {
        lvalue: Expression;
        rvalue: Expression;
      };
    }
  | {
      kind: StatementKind.Expression;
      value: Expression;
    }
  | {
      kind: StatementKind.Loop;
      value: {
        body: Statement[];
      };
    }
  | {
      kind: StatementKind.If;
      value: {
        condition: Expression;
        then: Statement[];
        otherwise: Statement[];
      };
    }
  | {
      kind: StatementKind.Break;
    }
  | {
      kind: StatementKind.Continue;
    }
  | {
      kind: StatementKind.Return;
      value: Expression;
    }
  | {
      kind: StatementKind.Block;
      value: {
        body: Statement[];
      };
    };

export type Statement = SpanData<StatementData>;

export enum BinaryOperator {
  Plus = "+",
  Minus = "-",
  Times = "*",
  Divide = "/",
  Modulo = "%",
  Raise = "^",
  Equals = "==",
  NotEquals = "!=",
  Greater = ">",
  GreaterEqual = ">=",
  Less = "<",
  LessEqual = "<=",
  And = "&&",
  Or = "||",
}

export enum UnaryOperator {
  Plus = "+",
  Minus = "-",
  Not = "!",
}

const UNARY_TOKENS = {
  [TokenKind.Plus]: UnaryOperator.Plus,
  [TokenKind.Minus]: UnaryOperator.Minus,
  [TokenKind.Exclamation]: UnaryOperator.Not,
};

const OPERATOR_PRECEDENCE = {
  [BinaryOperator.Or]: 0,
  [BinaryOperator.And]: 1,
  [BinaryOperator.Equals]: 2,
  [BinaryOperator.NotEquals]: 2,
  [BinaryOperator.Greater]: 2,
  [BinaryOperator.GreaterEqual]: 2,
  [BinaryOperator.Less]: 2,
  [BinaryOperator.LessEqual]: 2,
  [BinaryOperator.Plus]: 3,
  [BinaryOperator.Minus]: 3,
  [BinaryOperator.Times]: 4,
  [BinaryOperator.Divide]: 4,
  [BinaryOperator.Modulo]: 4,
  [BinaryOperator.Raise]: 5,
};

const TOKEN_TO_OPERATOR = {
  [TokenKind.Plus]: BinaryOperator.Plus,
  [TokenKind.Minus]: BinaryOperator.Minus,
  [TokenKind.Times]: BinaryOperator.Times,
  [TokenKind.Divide]: BinaryOperator.Divide,
  [TokenKind.Modulo]: BinaryOperator.Modulo,
  [TokenKind.Raise]: BinaryOperator.Raise,
  [TokenKind.Equals]: BinaryOperator.Equals,
  [TokenKind.NotEquals]: BinaryOperator.NotEquals,
  [TokenKind.Greater]: BinaryOperator.Greater,
  [TokenKind.GreaterEqual]: BinaryOperator.GreaterEqual,
  [TokenKind.Less]: BinaryOperator.Less,
  [TokenKind.LessEqual]: BinaryOperator.LessEqual,
  [TokenKind.And]: BinaryOperator.And,
  [TokenKind.Or]: BinaryOperator.Or,
};

const ASSIGNMENT_TO_OPERATOR = {
  [TokenKind.PlusAssign]: BinaryOperator.Plus,
  [TokenKind.MinusAssign]: BinaryOperator.Minus,
  [TokenKind.TimesAssign]: BinaryOperator.Times,
  [TokenKind.DivideAssign]: BinaryOperator.Divide,
  [TokenKind.ModuloAssign]: BinaryOperator.Modulo,
  [TokenKind.RaiseAssign]: BinaryOperator.Raise,
};

function getOperatorFromToken(token: TokenKind): BinaryOperator | undefined {
  if (TOKEN_TO_OPERATOR.hasOwnProperty(token)) {
    return TOKEN_TO_OPERATOR[token];
  }
}

export enum ExpressionKind {
  Number = "Number",
  Boolean = "Boolean",
  String = "String",
  Identifier = "Identifier",
  List = "List",
  Object = "Object",
  Call = "Call",
  Member = "Member",
  Index = "Index",
  Lambda = "Lambda",
  None = "None",
  Binary = "Binary",
  Unary = "Unary",
}

export interface Spread<T> {
  subject: T;
  isSpread: boolean;
}

type ExpressionData =
  | {
      kind: ExpressionKind.Number;
      value: number;
    }
  | {
      kind: ExpressionKind.Boolean;
      value: boolean;
    }
  | {
      kind: ExpressionKind.String;
      value: string;
    }
  | {
      kind: ExpressionKind.Identifier;
      value: string;
    }
  | {
      kind: ExpressionKind.List;
      value: Spread<Expression>[];
    }
  | {
      kind: ExpressionKind.Object;
      value: [string, Expression][];
    }
  | {
      kind: ExpressionKind.Call;
      value: {
        subject: Expression;
        isOption: boolean;
        arguments: Spread<Expression>[];
      };
    }
  | {
      kind: ExpressionKind.Member;
      value: {
        subject: Expression;
        isOption: boolean;
        member: string;
      };
    }
  | {
      kind: ExpressionKind.Index;
      value: {
        subject: Expression;
        isOption: boolean;
        index: Expression;
      };
    }
  | {
      kind: ExpressionKind.Lambda;
      value: {
        parameters: Spread<string[]>;
        body: Statement[];
      };
    }
  | {
      kind: ExpressionKind.Binary;
      value: {
        op: BinaryOperator;
        lhs: Expression;
        rhs: Expression;
      };
    }
  | {
      kind: ExpressionKind.None;
    }
  | {
      kind: ExpressionKind.Boolean;
      value: boolean;
    }
  | {
      kind: ExpressionKind.Unary;
      value: {
        op: UnaryOperator;
        operand: Expression;
      };
    };

export type Expression = SpanData<ExpressionData>;

export class Parser {
  public tokens: Token[];
  private index: number = 0;

  constructor(private name: string, private source: string) {
    const lexer = new Lexer(name, source);
    this.tokens = [...lexer.readTokens()];
  }

  private createEmptySpan(): Span {
    return {
      source: this.name,
      start: this.tokens.length - 1,
      end: this.tokens.length - 1,
    };
  }

  private createError(message: string, span?: Span): ParseError {
    span ??= this.createEmptySpan();
    return new ParseError(span, this.index, message);
  }

  private tryParse<T>(parser: () => T): T {
    const startIndex = this.index;
    try {
      return parser();
    } catch (ex) {
      this.index = startIndex;
      throw ex;
    }
  }

  private nextToken(): Token {
    const token = this.tokens[this.index];
    this.index += 1;
    if (token) {
      return token;
    } else {
      this.index -= 1;
      throw this.createError("unexpected EOF");
    }
  }

  private peekToken(): Token | undefined {
    const token = this.tokens[this.index];
    return token;
  }

  private tryParseNumber(): Expression {
    return this.tryParse(() => {
      const token = this.nextToken();
      if (token.data.kind === TokenKind.Number) {
        return {
          span: token.span,
          data: {
            kind: ExpressionKind.Number,
            value: token.data.value,
          },
        };
      } else {
        throw this.createError("expected number", token.span);
      }
    });
  }

  private tryParseString(): Expression {
    return this.tryParse(() => {
      const token = this.nextToken();
      if (token.data.kind === TokenKind.String) {
        return {
          span: token.span,
          data: {
            kind: ExpressionKind.String,
            value: token.data.value,
          },
        };
      } else {
        throw this.createError("expected string", token.span);
      }
    });
  }

  private tryParseIdentifierString(): SpanData<string> {
    return this.tryParse(() => {
      const token = this.nextToken();
      if (token.data.kind === TokenKind.Identifier) {
        return {
          span: token.span,
          data: token.data.value,
        };
      } else if (token.data.kind === TokenKind.New) {
        return {
          span: token.span,
          data: "new",
        };
      } else {
        throw this.createError("expected identifier", token.span);
      }
    });
  }

  private tryParseIdentifier(): Expression {
    return this.tryParse(() => {
      const data = this.tryParseIdentifierString();
      return {
        span: data.span,
        data: {
          kind: ExpressionKind.Identifier,
          value: data.data,
        },
      };
    });
  }

  private tryParseToken(kind: TokenKind): Token {
    return this.tryParse(() => {
      const token = this.nextToken();
      if (token?.data?.kind === kind) {
        return token;
      } else {
        this.index -= 1;
        throw this.createError(`expected token: ${kind}`, token?.span);
      }
    });
  }

  private tryParseSpreadExpression(): Spread<Expression> {
    return this.tryParse(() => {
      const token = this.nextToken();
      let isSpread = false;
      if (token.data.kind === TokenKind.Spread) {
        isSpread = true;
      } else {
        this.index -= 1;
      }

      const expr = this.tryParseExpression();

      return {
        isSpread,
        subject: expr,
      };
    });
  }

  private tryParseSeparated<T>(
    startToken: TokenKind,
    endToken: TokenKind,
    delimiter: () => void,
    parser: () => T,
    isDelimiterWhitespace: boolean = false
  ): SpanData<T[]> {
    return this.tryParse(() => {
      const open = this.tryParseToken(startToken);
      const list: T[] = [];
      let close: Token | undefined;

      this.skipWhitespace();

      while (true) {
        const token = this.nextToken();
        if (token.data.kind === endToken) {
          // End of list
          close = token;
          break;
        } else {
          this.index -= 1;
        }

        const res = parser();

        list.push(res);

        if (!isDelimiterWhitespace) {
          // this.skipWhitespace();
        }

        // Check if we're at the end
        const nextToken = this.peekToken();
        if (nextToken?.data?.kind !== endToken) {
          delimiter();
        }
      }

      return {
        span: {
          source: this.name,
          start: open.span.start,
          end: close?.span?.end ?? this.source.length - 1,
        },
        data: list,
      };
    });
  }

  private tryParseBoolean(): Expression {
    return this.tryParse(() => {
      const token = this.nextToken();
      const expression = {
        span: token.span,
        data: {
          kind: ExpressionKind.Boolean,
          value: false,
        },
      };
      if (token.data.kind === TokenKind.True) {
        expression.data.value = true;
      } else if (token.data.kind === TokenKind.False) {
        expression.data.value = false;
      } else {
        throw this.createError("expected boolean", token.span);
      }
      return expression as Expression;
    });
  }

  private tryParseComma(): Token {
    return this.tryParse(() => {
      this.skipWhitespace();
      const token = this.tryParseToken(TokenKind.Comma);
      this.skipWhitespace();
      return token;
    });
  }

  private tryParseList(): Expression {
    return this.tryParse(() => {
      const list = this.tryParseSeparated<Spread<Expression>>(
        TokenKind.OpenBracket,
        TokenKind.CloseBracket,
        this.tryParseComma.bind(this),
        this.tryParseSpreadExpression.bind(this)
      );

      return {
        span: list.span,
        data: {
          kind: ExpressionKind.List,
          value: list.data,
        },
      };
    });
  }

  private tryParseParameter(): Spread<string> {
    return this.tryParse(() => {
      const token = this.nextToken();

      let isSpread = false;
      if (token.data.kind === TokenKind.Spread) {
        isSpread = true;
      } else {
        this.index -= 1;
      }

      const identifier = this.nextToken();
      if (identifier.data.kind === TokenKind.Identifier) {
        return {
          isSpread,
          subject: identifier.data.value,
        };
      } else {
        throw this.createError("expected identifier", identifier.span);
      }
    });
  }

  private tryParseParameters(): SpanData<Spread<string[]>> {
    return this.tryParse(() => {
      const params = this.tryParseSeparated<Spread<string>>(
        TokenKind.OpenParen,
        TokenKind.CloseParen,
        this.tryParseComma.bind(this),
        this.tryParseParameter.bind(this)
      );

      const spreads = params.data;
      let isSpread = false;
      for (let i = 0; i < spreads.length; i++) {
        const isLast = i === spreads.length - 1;
        if (spreads[i].isSpread) {
          if (isLast) {
            isSpread = true;
          } else {
            // Only the last parameter may be spread
            throw this.createError(
              "only the last parameter of a function may be spreadable",
              params.span
            );
          }
        }
      }

      return {
        span: params.span,
        data: {
          isSpread,
          subject: spreads.map((item) => item.subject),
        },
      };
    });
  }

  private tryParseBody(): SpanData<Statement[]> {
    return this.tryParseSeparated(
      TokenKind.OpenBrace,
      TokenKind.CloseBrace,
      this.tryParseNewline.bind(this),
      this.tryParseStatement.bind(this),
      true
    );
  }

  private tryParseExpressionBody(): SpanData<Statement[]> {
    return this.tryParse(() => {
      const expr = this.tryParseExpression();
      return {
        span: expr.span,
        data: [
          {
            span: expr.span,
            data: {
              kind: StatementKind.Return,
              value: expr,
            },
          },
        ],
      };
    });
  }

  private tryParseLambdaBody(): SpanData<Statement[]> {
    return this.tryParsers([
      this.tryParseExpressionBody.bind(this),
      this.tryParseBody.bind(this),
    ]);
  }

  public tryParseLambda(): Expression {
    return this.tryParse(() => {
      const params = this.tryParseParameters();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Arrow);
      this.skipWhitespace();
      const body = this.tryParseLambdaBody();
      return {
        span: {
          source: this.name,
          start: params.span.start,
          end: body.span.end,
        },
        data: {
          kind: ExpressionKind.Lambda,
          value: {
            parameters: params.data,
            body: body.data,
          },
        },
      };
    });
  }

  private tryParseField(): SpanData<[string, Expression]> {
    return this.tryParse(() => {
      const name = this.tryParseIdentifierString();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Colon);
      this.skipWhitespace();
      const expr = this.tryParseExpression();
      return {
        span: {
          source: this.source,
          start: name.span.start,
          end: expr.span.end,
        },
        data: [name.data, expr],
      };
    });
  }

  private tryParseInferredField(): SpanData<[string, Expression]> {
    return this.tryParse(() => {
      const name = this.tryParseIdentifierString();
      const expr: Expression = {
        span: name.span,
        data: {
          kind: ExpressionKind.Identifier,
          value: name.data,
        }
      };
      return {
        span: name.span,
        data: [name.data, expr],
      };
    });
  }

  private tryParseMethod(): SpanData<[string, Expression]> {
    return this.tryParse(() => {
      const name = this.tryParseIdentifierString();
      this.skipWhitespace();
      const params = this.tryParseParameters();
      this.skipWhitespace();
      const body = this.tryParseBody();

      const span: Span = {
        source: this.name,
        start: name.span.start,
        end: body.span.end,
      };

      const lambda: Expression = {
        span,
        data: {
          kind: ExpressionKind.Lambda,
          value: {
            parameters: params.data,
            body: body.data,
          },
        },
      };

      return {
        span,
        data: [name.data, lambda],
      };
    });
  }

  private tryParseObjectMember(): SpanData<[string, Expression]> {
    return this.tryParsers([
      this.tryParseField.bind(this),
      this.tryParseMethod.bind(this),
      this.tryParseInferredField.bind(this),
    ]);
  }

  private tryParseObject(): Expression {
    return this.tryParse(() => {
      const fields = this.tryParseSeparated<SpanData<[string, Expression]>>(
        TokenKind.OpenBrace,
        TokenKind.CloseBrace,
        this.tryParseComma.bind(this),
        this.tryParseObjectMember.bind(this)
      );
      const fieldsEntries = fields.data.map((entry) => entry.data);
      return {
        span: fields.span,
        data: {
          kind: ExpressionKind.Object,
          value: fieldsEntries,
        },
      };
    });
  }

  private tryParseClassObject(): Expression {
    return this.tryParse(() => {
      const fields = this.tryParseSeparated<SpanData<[string, Expression]>>(
        TokenKind.OpenBrace,
        TokenKind.CloseBrace,
        this.tryParseNewline.bind(this),
        this.tryParseMethod.bind(this)
      );
      const fieldsEntries = fields.data.map((entry) => entry.data);
      return {
        span: fields.span,
        data: {
          kind: ExpressionKind.Object,
          value: fieldsEntries,
        },
      };
    });
  }

  private joinSpans(a: Span, b: Span): Span {
    return {
      source: a.source,
      start: a.start,
      end: b.end,
    };
  }

  private createClassDeclaration(
    span: Span,
    isPublic: boolean,
    name: string,
    baseClass: Expression,
    body: Expression
  ): Statement {
    const defineClassCall = this.createFunctionCall(span, "__define_class__", [
      {
        isSpread: false,
        subject: body,
      },
    ]);
    return {
      span,
      data: {
        kind: StatementKind.Declaration,
        value: {
          isPublic,
          name,
          value: defineClassCall,
        },
      },
    };
  }

  private tryParseSubclass(): Statement {
    return this.tryParse(() => {
      const start = this.index;
      const isPublic = this.tryParsePublic();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Class);
      this.skipWhitespace();
      const name = this.tryParseIdentifierString().data;
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Colon);
      this.skipWhitespace();
      const parent = this.tryParseExpression();
      this.skipWhitespace();
      const obj = this.tryParseClassObject();
      return this.createClassDeclaration(
        this.joinSpans(this.tokens[start].span, obj.span),
        isPublic,
        name,
        parent,
        obj
      );
    });
  }

  public tryParseBareClass(): Statement {
    return this.tryParse(() => {
      const start = this.index;
      const isPublic = this.tryParsePublic();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Class);
      this.skipWhitespace();
      const name = this.tryParseIdentifierString().data;
      this.skipWhitespace();
      const obj = this.tryParseClassObject();
      const span = this.joinSpans(this.tokens[start].span, obj.span);
      const none = this.createNone(span);
      return this.createClassDeclaration(
        this.joinSpans(this.tokens[start].span, obj.span),
        isPublic,
        name,
        none,
        obj
      );
    });
  }

  private tryParseClass(): Statement {
    return this.tryParsers([
      this.tryParseSubclass.bind(this),
      this.tryParseBareClass.bind(this),
    ]);
  }

  private tryParsers<T>(parsers: (() => T)[]): T {
    let lastError: (Error & { specificity: number }) | undefined = undefined;
    for (const parser of parsers) {
      try {
        const res = parser();
        return res;
      } catch (ex) {
        if (typeof ex.specificity === "number") {
          const { specificity } = ex;
          const maxSpecificity =
            lastError?.specificity ?? Number.NEGATIVE_INFINITY;
          if (specificity > maxSpecificity) {
            lastError = ex;
          }
        } else {
          // Bubble up any particularly unexpected errors
          throw ex;
        }
      }
    }
    throw lastError;
  }

  private tryParsePublic(): boolean {
    return this.tryParse(() => {
      let isPublic = false;
      const token = this.nextToken();
      if (token.data.kind === TokenKind.Pub) {
        isPublic = true;
      } else {
        this.index -= 1;
      }
      return isPublic;
    });
  }

  private tryParseDeclaration(): Statement {
    return this.tryParse(() => {
      const start = this.index;
      const isPublic = this.tryParsePublic();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Let);
      this.skipWhitespace();
      const { data: name } = this.tryParseIdentifierString();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Assign);
      this.skipWhitespace();
      const value = this.tryParseExpression();

      return {
        span: {
          source: this.name,
          start: this.tokens[start].span.start,
          end: value.span.end,
        },
        data: {
          kind: StatementKind.Declaration,
          value: {
            isPublic,
            name,
            value,
          },
        },
      };
    });
  }

  private tryParseFunction(): Statement {
    return this.tryParse(() => {
      const start = this.index;
      const isPublic = this.tryParsePublic();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.func);
      this.skipWhitespace();
      const name = this.tryParseIdentifierString();
      this.skipWhitespace();
      const parameters = this.tryParseParameters();
      this.skipWhitespace();
      const body = this.tryParseBody();

      const span = {
        source: this.name,
        start,
        end: body.span.end,
      };

      const lambda: Expression = {
        span,
        data: {
          kind: ExpressionKind.Lambda,
          value: {
            parameters: parameters.data,
            body: body.data,
          },
        },
      };

      return {
        span,
        data: {
          kind: StatementKind.Declaration,
          value: {
            isPublic,
            name: name.data,
            value: lambda,
          },
        },
      };
    });
  }

  private tryParseNewline(): Token {
    return this.tryParse(() => {
      const token = this.nextToken();
      if (token.data.kind === TokenKind.Whitespace && token.data.isNewline) {
        return token;
      }
      throw this.createError("expected newline", token.span);
    });
  }

  private tryParseBreak(): Statement {
    return this.tryParse(() => {
      const token = this.tryParseToken(TokenKind.Break);
      return {
        span: token.span,
        data: {
          kind: StatementKind.Break,
        },
      };
    });
  }

  private tryParseContinue(): Statement {
    return this.tryParse(() => {
      const token = this.tryParseToken(TokenKind.Continue);
      return {
        span: token.span,
        data: {
          kind: StatementKind.Continue,
        },
      };
    });
  }

  private tryParseReturn(): Statement {
    return this.tryParse(() => {
      const token = this.tryParseToken(TokenKind.Return);

      // See if we have a value being returned
      const indexBeforeExpression = this.index;
      try {
        this.skipWhitespace();
        const value = this.tryParseExpression();
        return {
          span: {
            source: this.name,
            start: token.span.start,
            end: value.span.end,
          },
          data: {
            kind: StatementKind.Return,
            value,
          },
        };
      } catch (_ex) {
        // If no value is specified, return `None`
        this.index = indexBeforeExpression;
        return {
          span: token.span,
          data: {
            kind: StatementKind.Return,
            value: {
              span: token.span,
              data: {
                kind: ExpressionKind.None,
              },
            },
          },
        };
      }
    });
  }

  private tryParseWhitespace(): Token {
    return this.tryParse(() => {
      const token = this.nextToken();
      const { kind } = token.data;
      if (kind === TokenKind.Whitespace || kind === TokenKind.Comment) {
        return token;
      }
      throw this.createError("expected whitespace", token.span);
    });
  }

  private skipWhitespace() {
    this.tryParseAny(this.tryParseWhitespace.bind(this));
  }

  private tryParseAny<T>(parser: () => T): T[] {
    const results: T[] = [];
    while (true) {
      try {
        results.push(parser());
      } catch (_ex) {
        break;
      }
    }
    return results;
  }

  private tryParseOneOrZero<T>(parser: () => T): T | undefined {
    try {
      return parser();
    } catch (ex) {
      return;
    }
  }

  private tryParseOneOrMore<T>(parser: () => T): T[] {
    const results: T[] = [];
    results.push(parser());
    while (true) {
      try {
        results.push(parser());
      } catch (_ex) {
        break;
      }
    }
    return results;
  }

  private tryParseStatementLine(): Statement {
    return this.tryParse(() => {
      this.skipWhitespace();
      const statement = this.tryParseStatement();
      this.tryParseNewline();
      return statement;
    });
  }

  private tryParseStatements(): Statement[] {
    return this.tryParseAny(this.tryParseStatementLine.bind(this));
  }

  private tryParseParentheses(): Expression {
    return this.tryParse(() => {
      this.tryParseToken(TokenKind.OpenParen);
      this.skipWhitespace();
      const expression = this.tryParseExpression();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.CloseParen);
      return expression;
    });
  }

  private tryParseNone(): Expression {
    return this.tryParse(() => {
      const token = this.tryParseToken(TokenKind.None);
      const expression = this.createNone(token.span);
      return expression;
    });
  }

  private tryParseAtom(): Expression {
    return this.tryParsers([
      this.tryParseNone.bind(this),
      this.tryParseLambda.bind(this),
      this.tryParseParentheses.bind(this),
      this.tryParseObject.bind(this),
      this.tryParseList.bind(this),
      this.tryParseBoolean.bind(this),
      this.tryParseNumber.bind(this),
      this.tryParseString.bind(this),
      this.tryParseIdentifier.bind(this),
    ]);
  }

  private tryParseSubjectExpression(subject: Expression): Expression {
    return this.tryParsers([
      this.tryParseCallOf.bind(this, subject),
      this.tryParseIndexOf.bind(this, subject),
      this.tryParseMemberOf.bind(this, subject),
    ]);
  }

  private tryParseSubjectConstructor(subject: Expression): Expression {
    return this.tryParsers([
      this.tryParseIndexOf.bind(this, subject),
      this.tryParseMemberOf.bind(this, subject),
    ]);
  }

  private tryParseNew(): Expression {
    return this.tryParse(() => {
      const start = this.tryParseToken(TokenKind.New);
      this.skipWhitespace();
      let ctr = this.tryParseAtom();
      while (true) {
        try {
          ctr = this.tryParseSubjectConstructor(ctr);
        } catch (_) {
          break;
        }
      }
      this.skipWhitespace();
      const args = this.tryParseSeparated<Spread<Expression>>(
        TokenKind.OpenParen,
        TokenKind.CloseParen,
        this.tryParseComma.bind(this),
        this.tryParseSpreadExpression.bind(this)
      );
      return {
        span: this.joinSpans(start.span, args.span),
        data: this.createMethodCall(ctr, "new", args.data).data,
      };
    });
  }

  private tryParseUnaryOperator(): SpanData<UnaryOperator> {
    return this.tryParse(() => {
      const token = this.nextToken();
      const operator = UNARY_TOKENS[token.data.kind];
      if (operator !== undefined) {
        return {
          span: token.span,
          data: operator,
        };
      }
      throw this.createError("expected unary operator", token.span);
    });
  }

  private tryParseUnary(): Expression {
    return this.tryParse(() => {
      const operator = this.tryParseUnaryOperator();
      const expr = this.tryParsePrimaryExpression();
      return {
        span: this.joinSpans(operator.span, expr.span),
        data: {
          kind: ExpressionKind.Unary,
          value: {
            op: operator.data,
            operand: expr,
          },
        },
      };
    });
  }

  private tryParseInitialExpression(): Expression {
    return this.tryParsers([
      this.tryParseNew.bind(this),
      this.tryParseUnary.bind(this),
      this.tryParseAtom.bind(this),
    ]);
  }

  private tryParsePrimaryExpression(): Expression {
    return this.tryParse(() => {
      let expr = this.tryParseInitialExpression();
      while (true) {
        try {
          expr = this.tryParseSubjectExpression(expr);
        } catch (_) {
          break;
        }
      }
      return expr;
    });
  }

  private peekOperator(): BinaryOperator | undefined {
    const token = this.peekToken();
    if (token) {
      return getOperatorFromToken(token.data.kind);
    }
  }

  public tryParseExpression(): Expression {
    return this.tryParseOperatorPrecedence(0);
  }

  private createBinary(
    op: BinaryOperator,
    lhs: Expression,
    rhs: Expression
  ): Expression {
    return {
      span: {
        source: this.name,
        start: lhs.span.start,
        end: rhs.span.end,
      },
      data: {
        kind: ExpressionKind.Binary,
        value: {
          op,
          lhs,
          rhs,
        },
      },
    };
  }

  private wasLastTokenWhitespace(): boolean {
    const lastToken = this.tokens[this.index - 1];
    return lastToken?.data?.kind === TokenKind.Whitespace;
  }

  private rewindWhitespace(): boolean {
    let hasRewinded = false;
    while (true) {
      const lastToken = this.tokens[this.index - 1];
      if (lastToken?.data?.kind === TokenKind.Whitespace) {
        this.index -= 1;
        hasRewinded = true;
        continue;
      }
      if (lastToken?.data?.kind === TokenKind.Comment) {
        this.index -= 1;
        hasRewinded = true;
        continue;
      }
      return hasRewinded;
    }
  }

  private tryParseOperatorPrecedence(minPrecedence: number): Expression {
    return this.tryParse(() => {
      let lhs = this.tryParsePrimaryExpression();
      let rhs: Expression | undefined;

      this.skipWhitespace();
      let op = this.peekOperator();

      while (op !== undefined && OPERATOR_PRECEDENCE[op] >= minPrecedence) {
        this.index += 1;
        const precedence = OPERATOR_PRECEDENCE[op];
        this.skipWhitespace();
        try {
          rhs = this.tryParseOperatorPrecedence(precedence + 1);
        } catch (_ex) {
          // No more expressions, we've reached an end
          break;
        }
        lhs = this.createBinary(op, lhs, rhs);
        this.skipWhitespace();
        op = this.peekOperator();
      }

      // We don't want to consume any whitespace following the expression.
      // That whitespace may be significant in the case that it contains a
      // linebreak.
      if (this.wasLastTokenWhitespace()) {
        this.index -= 1;
      }

      return lhs;
    });
  }

  private tryParseQuestionDot(): boolean {
    return this.tryParse(() => {
      this.tryParseToken(TokenKind.Question);
      this.tryParseToken(TokenKind.Dot);
      return true;
    });
  }

  private tryParseCallOf(subject: Expression): Expression {
    return this.tryParse(() => {
      this.skipWhitespace();
      const isOption = !!this.tryParseOneOrZero(
        this.tryParseQuestionDot.bind(this)
      );
      this.skipWhitespace();
      const args = this.tryParseSeparated<Spread<Expression>>(
        TokenKind.OpenParen,
        TokenKind.CloseParen,
        this.tryParseComma.bind(this),
        this.tryParseSpreadExpression.bind(this)
      );
      return {
        span: {
          source: this.name,
          start: subject.span.start,
          end: args.span.end,
        },
        data: {
          kind: ExpressionKind.Call,
          value: {
            subject,
            isOption,
            arguments: args.data,
          },
        },
      };
    });
  }

  private tryParseIndexOf(subject: Expression): Expression {
    return this.tryParse(() => {
      this.skipWhitespace();
      this.tryParseToken(TokenKind.OpenBracket);
      this.skipWhitespace();
      const index = this.tryParseExpression();
      this.skipWhitespace();
      const close = this.tryParseToken(TokenKind.CloseBracket);
      return {
        span: {
          source: this.name,
          start: subject.span.start,
          end: close.span.end,
        },
        data: {
          kind: ExpressionKind.Index,
          value: {
            subject,
            isOption: false,
            index,
          },
        },
      };
    });
  }

  private tryParseMemberOf(subject: Expression): Expression {
    return this.tryParse(() => {
      this.skipWhitespace();
      const question = this.tryParseOneOrZero<Token>(
        this.tryParseToken.bind(this, TokenKind.Question)
      );
      this.tryParseToken(TokenKind.Dot);
      this.skipWhitespace();
      const member = this.tryParseIdentifierString();
      return {
        span: {
          source: this.name,
          start: subject.span.start,
          end: member.span.end,
        },
        data: {
          kind: ExpressionKind.Member,
          value: {
            subject,
            isOption: !!question,
            member: member.data,
          },
        },
      };
    });
  }

  private tryParseExpressionStatement(): Statement {
    return this.tryParse(() => {
      const expr = this.tryParseExpression();
      return {
        span: expr.span,
        data: {
          kind: StatementKind.Expression,
          value: expr,
        },
      };
    });
  }

  private tryParseIf(): Statement {
    const start = this.tryParseToken(TokenKind.If);
    this.skipWhitespace();
    const condition = this.tryParseExpression();
    this.skipWhitespace();
    const then = this.tryParseBody();
    let endSpan = then.span;
    let otherwiseBody: Statement[] = [];
    const index = this.index;
    try {
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Else);
      this.skipWhitespace();
      const otherwise = this.tryParseBody();
      endSpan = otherwise.span;
      otherwiseBody = otherwise.data;
    } catch (_) {
      this.index = index;
    }
    return {
      span: {
        source: this.name,
        start: start.span.start,
        end: endSpan.end,
      },
      data: {
        kind: StatementKind.If,
        value: {
          condition,
          then: then.data,
          otherwise: otherwiseBody,
        },
      },
    };
  }

  private tryParseWhileLoop(): Statement {
    return this.tryParse(() => {
      const start = this.tryParseToken(TokenKind.While);
      this.skipWhitespace();
      const condition = this.tryParseExpression();
      this.skipWhitespace();
      const body = this.tryParseBody();

      const conditionSpan = condition.span;

      const conditionCheck: Statement = {
        span: conditionSpan,
        data: {
          kind: StatementKind.If,
          value: {
            condition,
            then: [
              {
                span: conditionSpan,
                data: { kind: StatementKind.Break },
              },
            ],
            otherwise: [],
          },
        },
      };

      const desugaredBody = [conditionCheck, ...body.data];

      return {
        span: {
          source: this.name,
          start: start.span.start,
          end: body.span.end,
        },
        data: {
          kind: StatementKind.Loop,
          value: {
            body: desugaredBody,
          },
        },
      };
    });
  }

  private createFunctionCall(
    span: Span,
    func: string,
    args: Spread<Expression>[]
  ): Expression {
    return {
      span,
      data: {
        kind: ExpressionKind.Call,
        value: {
          subject: {
            span,
            data: {
              kind: ExpressionKind.Identifier,
              value: func,
            },
          },
          isOption: false,
          arguments: args,
        },
      },
    };
  }

  private createMethodCall(
    obj: Expression,
    method: string,
    args: Spread<Expression>[]
  ): Expression {
    const memberExpr: Expression = {
      span: obj.span,
      data: {
        kind: ExpressionKind.Member,
        value: {
          subject: obj,
          isOption: false,
          member: method,
        },
      },
    };
    return {
      span: obj.span,
      data: {
        kind: ExpressionKind.Call,
        value: {
          subject: memberExpr,
          isOption: false,
          arguments: args,
        },
      },
    };
  }

  private createIdentifier(span: Span, name: string): Expression {
    return {
      span,
      data: {
        kind: ExpressionKind.Identifier,
        value: name,
      },
    };
  }

  private createNone(span: Span): Expression {
    return {
      span,
      data: {
        kind: ExpressionKind.None,
      },
    };
  }

  private tryParseForLoop(): Statement {
    return this.tryParse(() => {
      const start = this.tryParseToken(TokenKind.For);
      this.skipWhitespace();
      const varName = this.tryParseIdentifierString();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.In);
      this.skipWhitespace();

      const iterable = this.tryParseExpression();
      const iter = this.createMethodCall(iterable, "iter", []);

      this.skipWhitespace();
      const body = this.tryParseBody();

      const totalSpan = {
        source: this.name,
        start: start.span.start,
        end: body.span.end,
      };

      const desugaredLoopBody: Statement[] = [
        // Create the loop variable
        {
          span: iter.span,
          data: {
            kind: StatementKind.Declaration,
            value: {
              isPublic: false,
              name: varName.data,
              value: this.createMethodCall(iter, "next", []),
            },
          },
        },
        // Check that the loop variable is not None
        {
          span: iter.span,
          data: {
            kind: StatementKind.If,
            value: {
              condition: {
                span: iter.span,
                data: {
                  kind: ExpressionKind.Binary,
                  value: {
                    op: BinaryOperator.Equals,
                    lhs: this.createIdentifier(varName.span, varName.data),
                    rhs: this.createNone(iter.span),
                  },
                },
              },
              then: [
                {
                  span: iter.span,
                  data: { kind: StatementKind.Break },
                },
              ],
              otherwise: [],
            },
          },
        },
        ...body.data,
      ];

      const desugaredBlock: Statement[] = [
        {
          span: varName.span,
          data: {
            kind: StatementKind.Declaration,
            value: {
              isPublic: false,
              name: varName.data,
              value: iter,
            },
          },
        },
        {
          span: totalSpan,
          data: {
            kind: StatementKind.Loop,
            value: {
              body: desugaredLoopBody,
            },
          },
        },
      ];

      return {
        span: totalSpan,
        data: {
          kind: StatementKind.Block,
          value: {
            body: desugaredBlock,
          },
        },
      };
    });
  }

  private tryParseLoop(): Statement {
    return this.tryParse(() => {
      const start = this.tryParseToken(TokenKind.Loop);
      this.skipWhitespace();
      const body = this.tryParseBody();

      return {
        span: {
          source: this.name,
          start: start.span.start,
          end: body.span.end,
        },
        data: {
          kind: StatementKind.Loop,
          value: {
            body: body.data,
          },
        },
      };
    });
  }

  private tryParseAssignmentOperator(): BinaryOperator {
    return this.tryParse(() => {
      const token = this.nextToken();
      const op = ASSIGNMENT_TO_OPERATOR[token.data.kind];
      if (op !== undefined) {
        return op;
      }
      throw this.createError("expected assignment operator", token.span);
    });
  }

  private tryParseOpAssignment(): Statement {
    return this.tryParse(() => {
      const lvalue = this.tryParsePrimaryExpression();
      this.skipWhitespace();
      const operator = this.tryParseAssignmentOperator();
      this.skipWhitespace();
      const rvalue = this.tryParseExpression();
      const fullRvalue: Expression = {
        span: rvalue.span,
        data: {
          kind: ExpressionKind.Binary,
          value: {
            op: operator,
            lhs: lvalue,
            rhs: rvalue,
          },
        },
      };
      return {
        span: this.joinSpans(lvalue.span, rvalue.span),
        data: {
          kind: StatementKind.Assignment,
          value: {
            lvalue,
            rvalue: fullRvalue,
          },
        },
      };
    });
  }

  private tryParseAssignment(): Statement {
    return this.tryParse(() => {
      const lvalue = this.tryParsePrimaryExpression();
      this.skipWhitespace();
      this.tryParseToken(TokenKind.Assign);
      this.skipWhitespace();
      const rvalue = this.tryParseExpression();
      return {
        span: this.joinSpans(lvalue.span, rvalue.span),
        data: {
          kind: StatementKind.Assignment,
          value: {
            lvalue,
            rvalue,
          },
        },
      };
    });
  }

  public tryParseStatement(): Statement {
    return this.tryParsers([
      this.tryParseIf.bind(this),
      this.tryParseClass.bind(this),
      this.tryParseForLoop.bind(this),
      this.tryParseWhileLoop.bind(this),
      this.tryParseLoop.bind(this),
      this.tryParseDeclaration.bind(this),
      this.tryParseReturn.bind(this),
      this.tryParseFunction.bind(this),
      this.tryParseBreak.bind(this),
      this.tryParseContinue.bind(this),
      this.tryParseOpAssignment.bind(this),
      this.tryParseAssignment.bind(this),
      this.tryParseExpressionStatement.bind(this),
    ]);
  }

  private isAtEnd(): boolean {
    if (this.index >= this.tokens.length) {
      return true;
    }
    if (
      this.index === this.tokens.length - 1 &&
      this.tokens[this.index].data.kind === TokenKind.Whitespace
    ) {
      return true;
    }
    return false;
  }

  private tryParseSourceLine(): [Statement, boolean] {
    return this.tryParse(() => {
      const statement = this.tryParseStatement();
      const next = this.peekToken();
      let isEOF = false;

      if (next === undefined) {
        isEOF = true;
      } else if (next.data.kind === TokenKind.Whitespace) {
        if (next.data.isNewline) {
          this.index += 1;
        } else {
          throw this.createError("expected newline", next.span);
        }
      } else if (next.data.kind === TokenKind.Comment) {
        this.index += 1;
      } else {
        throw this.createError("expected newline or EOF", next.span);
      }

      return [statement, isEOF];
    });
  }

  public tryParseSource(): Statement[] {
    const statements: Statement[] = [];

    this.skipWhitespace();
    while (true) {
      if (this.peekToken() === undefined) {
        // Reached the end of the source
        break;
      }

      const [statement, isEOF] = this.tryParseSourceLine();
      statements.push(statement);
      if (isEOF) {
        break;
      }
    }

    return statements;
  }
}

export function evalExpr(expr: Expression): number {
  if (expr.data.kind === ExpressionKind.Number) {
    return expr.data.value;
  }
  if (expr.data.kind === ExpressionKind.Binary) {
    const lhs = evalExpr(expr.data.value.lhs);
    const rhs = evalExpr(expr.data.value.rhs);
    switch (expr.data.value.op) {
      case BinaryOperator.Plus:
        return lhs + rhs;
      case BinaryOperator.Minus:
        return lhs - rhs;
      case BinaryOperator.Times:
        return lhs * rhs;
      case BinaryOperator.Divide:
        return lhs / rhs;
      case BinaryOperator.Modulo:
        return lhs % rhs;
      case BinaryOperator.Raise:
        return lhs ** rhs;
    }
  }
  return 0;
}
