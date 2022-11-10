import { Expression, ExpressionKind } from "../parser/parser";

export class JsEmitter {
  private strings: string[] = [];

  public emitRaw(text: string) {
    this.strings.push(text);
  }

  public emitNumber(num: number) {
    this.emitRaw('' + num);
  }

  public emitBoolean(bool: boolean) {
    this.emitRaw('' + bool);
  }

  public emitExpression(expr: Expression) {
    switch (expr.data.kind) {
      case ExpressionKind.Boolean:
        this.emitBoolean(expr.data.value);
        break;
      case ExpressionKind.Number:
        this.emitNumber(expr.data.value);
        break;
    }
  }

  public build(): string {
    return this.strings.join('');
  }
}