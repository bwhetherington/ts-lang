import * as readline from "readline";
import { Engine, State } from "./engine/engine";
import { Parser, StatementKind } from "./parser/parser";
import { Span } from "./parser/util";

function promptHigh(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, (res) => resolve(res)));
}

export async function repl() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });
  const prompt = promptHigh.bind(null, rl);

  const engine = new Engine();
  engine.init();
  engine.context.descend();

  try {
    while (true) {
      const res = await prompt("> ");
      try {
        const parser = new Parser("<stdin>", res);
        const statement = parser.tryParseStatement();
        if (statement.data.kind === StatementKind.Expression) {
          const res = engine.evaluate(statement.data.value);
          engine.println(res);
        } else {
          engine.execute(State.Run, statement);
        }
      } catch (ex) {
        if (ex.span) {
          const span = ex.span as Span;
          console.error("error: " + res.slice(span.start, span.end));
          console.error(ex.message);
          console.error(engine.getStackTrace());
        }
        // console.log(ex.stack);
      }
    }
  } finally {
    rl.close();
  }
}
