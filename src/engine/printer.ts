export class Printer {
  private buffer: string = "";

  public rawPrintLine: (s: string) => void = (s) => console.log(s);

  public print(str: string) {
    this.buffer += str;
    this.tryFlush();
  }

  public println(str: string) {
    this.print(str + "\n");
  }

  public newline() {
    this.print("\n");
  }

  private tryFlush() {
    const lastNewline = this.buffer.lastIndexOf("\n");
    if (lastNewline > -1) {
      this.rawPrintLine(this.buffer.slice(0, lastNewline));
      this.buffer = this.buffer.slice(lastNewline + 1);
    }
  }
}
