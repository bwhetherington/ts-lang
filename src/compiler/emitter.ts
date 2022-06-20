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

  public build(): string {
    return this.strings.join('');
  }
}