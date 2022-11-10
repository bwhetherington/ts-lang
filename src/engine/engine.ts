import {
  ValueKind,
  Value,
  compareValues,
  TRUE,
  NONE,
  FALSE,
  ObjectValue,
  valueToString,
  intoValue,
} from "./value";
import {
  BinaryOperator,
  Expression,
  ExpressionKind,
  Parser,
  Spread,
  Statement,
  StatementKind,
  UnaryOperator,
} from "../parser/parser";
import { Context } from "./context";
import { getSpanPos, Span } from "../parser/util";

import classSrc from "./core/class";
import ioSrc from "./core/io";
import iterSrc from "./core/iter";
import protosSrc from "./core/protos";
import { Printer } from "./printer";

type Exporter = (name: string, value: Value) => void;

export class EvalError extends Error {
  public span?: Span;

  constructor(span: Span | undefined, message: string) {
    super(message);
    this.span = span;
  }
}

type Runnable = Statement | Expression;

export enum State {
  Run,
  Block,
  Break,
  Return,
}

export class Engine {
  private global: Context = new Context();
  public context: Context = new Context();
  private returnRegister?: Value;

  private runStack: Runnable[] = [];

  private srcMap: Map<string, string> = new Map();

  private protos: Map<ValueKind, Value> = new Map([
    [ValueKind.Number, NONE],
    [ValueKind.Boolean, NONE],
    [ValueKind.String, NONE],
    [ValueKind.List, NONE],
  ]);

  public printer = new Printer();

  constructor() {
    this.context.parentContext = this.global;
  }

  private getLastSpan(): Span {
    return this.runStack[this.runStack.length - 1].span;
  }

  private createError(message: string): EvalError {
    return new EvalError(this.getLastSpan(), message);
  }

  private getPrintableString(value: Value): string {
    if (value.kind === ValueKind.String) {
      return value.value;
    }
    return valueToString(value);
  }

  public init() {
    this.global.set(
      "__println__",
      intoValue((_self, ...strs) => {
        const line = strs.map((val) => this.getPrintableString(val)).join(" ");
        this.printer.println(line);
        return NONE;
      })
    );
    this.global.set(
      "__print__",
      intoValue((_self, ...strs) => {
        const line = strs.map((val) => this.getPrintableString(val)).join(" ");
        this.printer.print(line);
        return NONE;
      })
    );
    this.global.set("create_object", {
      kind: ValueKind.Builtin,
      value: (_self, proto, obj) => {
        if (!(proto && obj)) {
          throw this.createError("undefined object");
        }

        if (
          !(proto.kind === ValueKind.Object && obj.kind === ValueKind.Object)
        ) {
          throw this.createError("no prototype found");
        }

        const newObj = obj.value.copy();
        newObj.proto = proto.value;
        return {
          kind: ValueKind.Object,
          value: newObj,
        };
      },
    });

    this.defineProtos();

    this.executeCore("core/class.rsc", classSrc);
    this.executeCore("core/io.rsc", ioSrc);
    this.executeCore("core/iter.rsc", iterSrc);
    this.executeCore("core/protos.rsc", protosSrc);

    const fib = (val: number) => {
      if (val < 2) {
        return val;
      } else {
        return fib(val - 1) + fib(val - 2);
      }
    };

    this.global.set(
      "fib_native",
      intoValue((_self, val) => {
        const num = this.expectValue(val, ValueKind.Number).value;
        return fib(num);
      })
    );
  }

  private createNumberProto(): Value {
    return intoValue({});
  }

  private createBooleanProto(): Value {
    return intoValue({});
  }

  private createStringProto(): Value {
    return intoValue({});
  }

  private createFunctionProto(): Value {
    return intoValue({});
  }

  private expectValue<K>(
    val: Value | undefined,
    kind: K & ValueKind
  ): Extract<Value, { kind: K }> {
    if (val?.kind === kind) {
      return val as Extract<Value, { kind: K }>;
    }
    throw this.createError(
      `value failed to match: ${valueToString(val ?? NONE)}, ${kind}`
    );
  }

  private createListProto(): Value {
    return intoValue({
      index_get: (self: Value, index: Value | undefined) => {
        const selfList = this.expectValue(self, ValueKind.List).value;
        const indexNum = this.expectValue(index, ValueKind.Number).value;

        if (indexNum < 0 || selfList.length <= indexNum) {
          throw this.createError("out of range error");
        }

        return selfList[indexNum];
      },
      index_set: (
        self: Value,
        index: Value | undefined,
        value: Value | undefined
      ) => {
        const selfList = this.expectValue(self, ValueKind.List).value;
        const indexNum = this.expectValue(index, ValueKind.Number).value;

        if (indexNum < 0 || selfList.length <= indexNum) {
          throw this.createError("out of range error");
        }

        if (value) {
          selfList[indexNum] = value;
        }

        return NONE;
      },
      len: (self: Value) => {
        const selfList = this.expectValue(self, ValueKind.List);
        return intoValue(selfList.value.length);
      },
      push: (self: Value, ...values: Value[]) => {
        const selfList = this.expectValue(self, ValueKind.List);
        for (const val of values) {
          selfList.value.push(val);
        }
        return NONE;
      },
      pop: (self: Value) => {
        const list = this.expectValue(self, ValueKind.List);
        return list.value.pop() ?? NONE;
      },
    });
  }

  private defineProtos() {
    const numProto = this.createNumberProto();
    const boolProto = this.createBooleanProto();
    const strProto = this.createStringProto();
    const listProto = this.createListProto();
    const fnProto = this.createFunctionProto();

    this.global.set("Number", numProto);
    this.global.set("Boolean", boolProto);
    this.global.set("String", strProto);
    this.global.set("List", listProto);
    this.global.set("Function", fnProto);

    this.protos.set(ValueKind.Number, numProto);
    this.protos.set(ValueKind.Boolean, boolProto);
    this.protos.set(ValueKind.String, strProto);
    this.protos.set(ValueKind.List, listProto);
    this.protos.set(ValueKind.Function, fnProto);
    this.protos.set(ValueKind.Builtin, fnProto);
  }

  public executeModule(name: string, src: string): ObjectValue {
    const mod = new ObjectValue();
    this.srcMap.set(name, src);
    const parser = new Parser(name, src);
    const body = parser.tryParseSource();
    this.executeBlock(State.Run, body, (name, value) => {
      mod.set(name, value);
    });
    return mod;
  }

  public executeCore(name: string, src: string) {
    this.srcMap.set(name, src);
    const parser = new Parser(name, src);
    const body = parser.tryParseSource();
    this.executeBlock(State.Run, body, (name, value) => {
      this.global.set(name, value);
    });
  }

  public println(line: Value) {
    this.printer;
    if (line.kind === ValueKind.String) {
      this.printer.println(line.value);
    } else {
      this.printer.println(valueToString(line));
    }
  }

  private *iterateValue(value: Value): Generator<Value> {
    if (value.kind === ValueKind.List) {
      for (let i = 0; i < value.value.length; i++) {
        yield value.value[i];
      }
    } else {
      const iter = this.callMethod(value, "iter", []);
      while (true) {
        const val = this.callMethod(iter, "next", []);
        if (compareValues(val, NONE)) {
          break;
        } else {
          yield val;
        }
      }
    }
  }

  private evaluateIdentifier(identifier: string, allowSuper: boolean): Value {
    if (!allowSuper && identifier === "super") {
      throw this.createError("unexpected super");
    }
    const value = this.context.get(identifier);
    if (value !== undefined) {
      return value;
    }
    throw this.createError(`undefined identifier: ${identifier}`);
  }

  private number(number: number): Value {
    return {
      kind: ValueKind.Number,
      value: number,
    };
  }

  private string(string: string): Value {
    return {
      kind: ValueKind.String,
      value: string,
    };
  }

  private boolean(boolean: boolean): Value {
    return {
      kind: ValueKind.Boolean,
      value: boolean,
    };
  }

  private evaluateUnary(op: UnaryOperator, value: Expression): Value {
    const rvalue = this.evaluate(value);
    switch (op) {
      case UnaryOperator.Minus:
        if (rvalue.kind === ValueKind.Number) {
          return this.number(-rvalue.value);
        }
        throw this.createError("expected number");
      case UnaryOperator.Plus:
        if (rvalue.kind === ValueKind.Number) {
          return this.number(+rvalue.value);
        }
        throw this.createError("expected number");
      case UnaryOperator.Not:
        if (rvalue.kind === ValueKind.Boolean) {
          return this.boolean(!rvalue.value);
        }
        throw this.createError("expected boolean");
    }
  }

  private evaluateAnd(lhs: Expression, rhs: Expression): Value {
    const left = this.expectValue(this.evaluate(lhs), ValueKind.Boolean);

    // See if we can short circuit
    if (!compareValues(left, TRUE)) {
      return FALSE;
    }
    const right = this.expectValue(this.evaluate(rhs), ValueKind.Boolean);

    return this.boolean(compareValues(right, TRUE));
  }

  private evaluateOr(lhs: Expression, rhs: Expression): Value {
    const left = this.expectValue(this.evaluate(lhs), ValueKind.Boolean);
    // See if we can short circuit
    if (compareValues(left, TRUE)) {
      return TRUE;
    }
    const right = this.expectValue(this.evaluate(rhs), ValueKind.Boolean);
    return this.boolean(compareValues(right, TRUE));
  }

  private evaluateNumeric(
    lhs: Expression,
    rhs: Expression,
    op: (x: number, y: number) => number
  ): Value {
    const left = this.expectValue(this.evaluate(lhs), ValueKind.Number);
    const right = this.expectValue(this.evaluate(rhs), ValueKind.Number);
    return this.number(op(left.value, right.value));
  }

  private evaluateNumericBoolean(
    lhs: Expression,
    rhs: Expression,
    op: (lhs: number, rhs: number) => boolean
  ): Value {
    const left = this.expectValue(this.evaluate(lhs), ValueKind.Number);
    const right = this.expectValue(this.evaluate(rhs), ValueKind.Number);
    return this.boolean(op(left.value, right.value));
  }

  private evaluateEquals(x: Value, y: Value): boolean {
    if (x.kind === ValueKind.None && y.kind === ValueKind.None) {
      return true;
    }
    if (x.kind !== ValueKind.None && x.kind === y.kind) {
      return x.value === y.value;
    }
    return false;
  }

  private evaluateBinary(
    op: BinaryOperator,
    lhs: Expression,
    rhs: Expression
  ): Value {
    switch (op) {
      case BinaryOperator.And:
        return this.evaluateAnd(lhs, rhs);
      case BinaryOperator.Or:
        return this.evaluateOr(lhs, rhs);
      case BinaryOperator.Plus:
        return this.evaluateNumeric(lhs, rhs, (x, y) => x + y);
      case BinaryOperator.Minus:
        return this.evaluateNumeric(lhs, rhs, (x, y) => x - y);
      case BinaryOperator.Times:
        return this.evaluateNumeric(lhs, rhs, (x, y) => x * y);
      case BinaryOperator.Divide:
        return this.evaluateNumeric(lhs, rhs, (x, y) => x / y);
      case BinaryOperator.Modulo:
        return this.evaluateNumeric(lhs, rhs, (x, y) => x % y);
      case BinaryOperator.Raise:
        return this.evaluateNumeric(lhs, rhs, (x, y) => x ** y);
      case BinaryOperator.Greater:
        return this.evaluateNumericBoolean(lhs, rhs, (x, y) => x > y);
      case BinaryOperator.GreaterEqual:
        return this.evaluateNumericBoolean(lhs, rhs, (x, y) => x >= y);
      case BinaryOperator.Less:
        return this.evaluateNumericBoolean(lhs, rhs, (x, y) => x < y);
      case BinaryOperator.LessEqual:
        return this.evaluateNumericBoolean(lhs, rhs, (x, y) => x <= y);
      case BinaryOperator.Equals:
        return this.boolean(
          this.evaluateEquals(this.evaluate(lhs), this.evaluate(rhs))
        );
      case BinaryOperator.NotEquals:
        return this.boolean(
          !this.evaluateEquals(this.evaluate(lhs), this.evaluate(rhs))
        );
      default:
        throw this.createError(`unknown operator: ${op}`);
    }
  }

  private evaluateLambda(
    parameters: Spread<string[]>,
    body: Statement[]
  ): Value {
    const lambda: Value = {
      kind: ValueKind.Function,
      value: {
        context: this.context.getSnapshot(),
        params: parameters,
        body: body,
      },
    };
    return lambda;
  }

  private callMethod(
    subject: Value,
    method: string,
    args: Value[],
    span?: Span
  ): Value {
    const [value, self] = this.getMember(subject, method, span);
    return this.call(value, self, args);
  }

  private defineSelf(self: Value, context: Context) {
    context.define("self", self);

    if (self.kind === ValueKind.Object) {
      const superObj = self.value.getSuper();
      if (superObj) {
        const superVal: Value = {
          kind: ValueKind.Object,
          value: superObj,
        };
        context.define("super", superVal);
      }
    }
  }

  // private invoke(f: Value, self: Value | undefined

  private evaluateFunction(
    self: Value | undefined,
    params: Spread<string[]>,
    context: Context,
    body: Statement[],
    args: Value[]
  ): Value {
    this.returnRegister = undefined;
    const oldContext = this.context;
    const newContext = context.getSnapshot();
    try {
      newContext.parentContext = oldContext;

      if (self) {
        // Add in a new context layer for self
        const selfLayer = new Context();
        this.defineSelf(self, selfLayer);
        newContext.parentContext = selfLayer;
        selfLayer.parentContext = oldContext;
      }
      this.context = newContext;

      // Define arguments

      const isSpread = params.isSpread;
      const lastNormalParam = isSpread
        ? params.subject.length - 1
        : params.subject.length;

      for (let i = 0; i < lastNormalParam; i++) {
        const param = params.subject[i];
        const arg = args[i] ?? NONE;
        this.context.define(param, arg);
      }

      if (isSpread) {
        const remaining = args.slice(lastNormalParam);
        const list: Value = {
          kind: ValueKind.List,
          value: remaining,
        };
        this.context.define(params.subject[lastNormalParam], list);
      }

      this.executeBlock(State.Block, body);
    } finally {
      this.context = oldContext;
    }
    return this.returnRegister ?? NONE;
  }

  private evaluateCall(subject: Expression, args: Spread<Expression>[]): Value {
    const [callable, self] = this.evaluateWithParent(subject);

    const argValues: Value[] = [];
    for (const argExpr of args) {
      const argVal = this.evaluate(argExpr.subject);
      if (argExpr.isSpread) {
        for (const inner of this.iterateValue(argVal)) {
          argValues.push(inner);
        }
      } else {
        argValues.push(argVal);
      }
    }

    return this.call(callable, self, argValues);
  }

  private call(callable: Value, self: Value | undefined, args: Value[]): Value {
    switch (callable.kind) {
      case ValueKind.Builtin:
        return callable.value(self ?? NONE, ...args);
      case ValueKind.Function:
        return this.evaluateFunction(
          self,
          callable.value.params,
          callable.value.context,
          callable.value.body,
          args
        );
      default:
        throw this.createError("expected callable");
    }
  }

  private evaluateObject(fields: [string, Expression][]): Value {
    const obj = new ObjectValue();

    for (const [field, expr] of fields) {
      const value = this.evaluate(expr);
      obj.set(field, value);
    }

    return {
      kind: ValueKind.Object,
      value: obj,
    };
  }

  private evaluateList(values: Spread<Expression>[]): Value {
    const list: Value[] = [];
    for (const spread of values) {
      const val = this.evaluate(spread.subject);
      if (spread.isSpread) {
        for (const innerVal of this.iterateValue(val)) {
          list.push(innerVal);
        }
      } else {
        list.push(val);
      }
    }
    return {
      kind: ValueKind.List,
      value: list,
    };
  }

  private getMember(
    subject: Value,
    field: string,
    span?: Span
  ): [Value, Value] {
    const constProto = this.protos.get(subject.kind);
    let object =
      constProto?.kind === ValueKind.Object ? constProto.value : undefined;

    if (!(subject.kind === ValueKind.Object || object)) {
      throw this.createError("no object or prototype");
    }

    object ??= (subject as Extract<Value, { kind: ValueKind.Object }>).value;

    const value = object.get(field);
    if (value === undefined) {
      throw this.createError("field not found: " + field);
    }
    return [value, subject];
  }

  private evaluateMember(subject: Expression, field: string): [Value, Value] {
    const obj = this.evaluate(subject, true);
    return this.getMember(obj, field, subject.span);
  }

  private evaluateIndex(
    subject: Expression,
    _isOption: boolean,
    index: Expression
  ): Value {
    const subjectValue = this.evaluate(subject, true);
    const indexValue = this.evaluate(index);
    return this.callMethod(
      subjectValue,
      "index_get",
      [indexValue],
      subject.span
    );
  }

  private evaluateWithParent(
    expr: Expression,
    allowSuper: boolean = false
  ): [Value, Value | undefined] {
    let res: [Value, Value | undefined];
    const lastItem = this.runStack[this.runStack.length - 1];
    const isAlsoStatement =
      lastItem?.data.kind === StatementKind.Expression &&
      lastItem.data.value === expr;
    if (!isAlsoStatement) {
      this.runStack.push(expr);
    }
    try {
      switch (expr.data.kind) {
        case ExpressionKind.Identifier:
          res = [
            this.evaluateIdentifier(expr.data.value, allowSuper),
            undefined,
          ];
          break;
        case ExpressionKind.Number:
          res = [this.number(expr.data.value), undefined];
          break;
        case ExpressionKind.String:
          res = [this.string(expr.data.value), undefined];
          break;
        case ExpressionKind.Boolean:
          res = [this.boolean(expr.data.value), undefined];
          break;
        case ExpressionKind.Unary:
          res = [
            this.evaluateUnary(expr.data.value.op, expr.data.value.operand),
            undefined,
          ];
          break;
        case ExpressionKind.Binary:
          res = [
            this.evaluateBinary(
              expr.data.value.op,
              expr.data.value.lhs,
              expr.data.value.rhs
            ),
            undefined,
          ];
          break;
        case ExpressionKind.Call:
          res = [
            this.evaluateCall(
              expr.data.value.subject,
              expr.data.value.arguments
            ),
            undefined,
          ];
          break;
        case ExpressionKind.Lambda:
          const { isSpread, subject } = expr.data.value.parameters;
          res = [
            this.evaluateLambda(
              {
                isSpread,
                subject: subject.map((param) => param.name),
              },
              expr.data.value.body
            ),
            undefined,
          ];
          break;
        case ExpressionKind.Object:
          res = [this.evaluateObject(expr.data.value), undefined];
          break;
        case ExpressionKind.Member:
          res = this.evaluateMember(
            expr.data.value.subject,
            expr.data.value.member
          );
          break;
        case ExpressionKind.Index:
          res = [
            this.evaluateIndex(
              expr.data.value.subject,
              expr.data.value.isOption,
              expr.data.value.index
            ),
            undefined,
          ];
          break;
        case ExpressionKind.List:
          res = [this.evaluateList(expr.data.value), undefined];
          break;
        case ExpressionKind.None:
          res = [NONE, undefined];
          break;
      }
    } catch (ex) {
      // console.error(this.getStackTrace());
      throw ex;
    } finally {
    }
    if (!isAlsoStatement) {
      this.runStack.pop();
    }
    return res;
  }

  public evaluate(expr: Expression, allowSuper: boolean = false): Value {
    return this.evaluateWithParent(expr, allowSuper)[0];
  }

  private executeDeclaration(
    state: State,
    isPublic: boolean,
    name: string,
    value: Expression,
    exporter?: Exporter
  ): State {
    const rvalue = this.evaluate(value);
    this.context.define(name, rvalue);
    if (isPublic) {
      exporter?.(name, rvalue);
    }
    return state;
  }

  public executeBlock(
    state: State,
    body: Statement[],
    exporter?: Exporter
  ): State {
    this.context.descend();
    try {
      for (const stmt of body) {
        state = this.execute(state, stmt, exporter);
        if (state === State.Break || state === State.Return) {
          break;
        }
      }
    } finally {
      this.context.ascend();
    }
    return state;
  }

  public executeReturn(_state: State, value: Expression): State {
    const val = this.evaluate(value);
    this.returnRegister = val;
    return State.Return;
  }

  private executeIf(
    state: State,
    cond: Expression,
    then: Statement[],
    otherwise: Statement[]
  ): State {
    const res = this.evaluate(cond);
    if (res.kind !== ValueKind.Boolean) {
      throw this.createError("expected boolean");
    }
    const isTrue = compareValues(res, TRUE);
    if (isTrue) {
      return this.executeBlock(state, then);
    } else {
      return this.executeBlock(state, otherwise);
    }
  }

  public getStackTrace(): string {
    let out = "";

    for (let i = this.runStack.length - 1; i >= 0; i--) {
      const { span } = this.runStack[i];
      const src = this.srcMap.get(span.source);
      if (!src) {
        break;
      }
      out += `  at ${src.slice(span.start, span.end)} (${this.getSpanSummary(
        span
      )})\n`;
    }

    return out;
  }

  private setLocationMember(subject: Expression, field: string, value: Value) {
    const subjectValue = this.evaluate(subject);
    if (subjectValue.kind === ValueKind.Object) {
      subjectValue.value.set(field, value);
    } else {
      throw this.createError("expected object");
    }
  }

  private setLocationIndex(
    subject: Expression,
    index: Expression,
    value: Value
  ) {
    const subjectValue = this.evaluate(subject);
    const indexValue = this.evaluate(index);
    this.callMethod(subjectValue, "index_set", [indexValue, value]);
  }

  private setLocation(lvalue: Expression, value: Value) {
    switch (lvalue.data.kind) {
      case ExpressionKind.Identifier:
        this.context.set(lvalue.data.value, value);
        break;
      case ExpressionKind.Member:
        this.setLocationMember(
          lvalue.data.value.subject,
          lvalue.data.value.member,
          value
        );
        break;
      case ExpressionKind.Index:
        this.setLocationIndex(
          lvalue.data.value.subject,
          lvalue.data.value.index,
          value
        );
        break;
    }
  }

  private executeAssignment(
    state: State,
    lvalue: Expression,
    rvalue: Expression
  ): State {
    const value = this.evaluate(rvalue);
    this.setLocation(lvalue, value);
    return state;
  }

  private executeLoop(state: State, body: Statement[]): State {
    while (true) {
      state = this.executeBlock(state, body);
      if (state === State.Break || state === State.Return) {
        break;
      }
    }
    return state;
  }

  private executeForLoop(
    state: State,
    variable: string,
    iterable: Expression,
    body: Statement[]
  ): State {
    const iterator = this.evaluate(iterable);
    for (const item of this.iterateValue(iterator)) {
      this.context.descend();
      this.context.set(variable, item);
      state = this.executeBlock(state, body);
      if (state === State.Break || state === State.Return) {
        break;
      }
      this.context.ascend();
    }
    return state;
  }

  public execute(state: State, stmt: Statement, exporter?: Exporter): State {
    const { span, data } = stmt;
    this.runStack.push(stmt);
    try {
      switch (data.kind) {
        case StatementKind.Declaration:
          state = this.executeDeclaration(
            state,
            data.value.isPublic,
            data.value.name,
            data.value.value,
            exporter
          );
          break;
        case StatementKind.Expression:
          this.evaluate(data.value);
          break;
        case StatementKind.Block:
          state = this.executeBlock(State.Block, data.value.body, exporter);
          break;
        case StatementKind.If:
          state = this.executeIf(
            state,
            data.value.condition,
            data.value.then,
            data.value.otherwise
          );
          break;
        case StatementKind.Assignment:
          state = this.executeAssignment(
            state,
            data.value.lvalue,
            data.value.rvalue
          );
          break;
        case StatementKind.Loop:
          state = this.executeLoop(state, data.value.body);
          break;
        case StatementKind.For:
          state = this.executeForLoop(
            state,
            data.value.variable,
            data.value.iterable,
            data.value.body
          );
          break;
        case StatementKind.Return:
          state = this.executeReturn(state, data.value);
          break;
        case StatementKind.Break:
          if (state === State.Block) {
            state = State.Break;
          }
          break;
      }
    } catch (ex) {
      console.error(this.getStackTrace());
      throw ex;
    } finally {
    }
    this.runStack.pop();
    return state;
  }

  public getSpanSummary(span: Span): string {
    const src = this.srcMap.get(span.source);
    if (!src) {
      return "<unknown>";
    }

    const [row, col] = getSpanPos(span, src);
    return `${span.source}:${row + 1}:${col + 1}`;
  }

  public printSpan(span: Span) {
    const src = this.srcMap.get(span.source);
    if (!src) {
      return;
    }
    const [row, col] = getSpanPos(span, src);
    console.log(`${span.source}: ${row + 1}:${col + 1}`);
    const lines = src.split("\n");

    for (let i = row - 2; i < row + 2; i++) {
      if (lines[i] !== undefined) {
        console.log(lines[i]);
      }
      if (i === row) {
        console.log("^".padStart(col + 1));
      }
    }
  }
}
