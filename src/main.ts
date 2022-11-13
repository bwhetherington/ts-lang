import { evalExpr, ExpressionKind, Parser } from "./parser/parser";
import * as fs from "fs/promises";
import { filterComments, getSpanPos, ParseError, Span } from "./parser/util";
import { Engine, State } from "./engine/engine";
import { repl } from "./repl";
import { intoValue, ObjectValue } from "./engine/value";

const FILE = process.argv[2];

async function main() {
  const engine = new Engine();
  try {
    engine.init(".");
    if (FILE) {
      engine.runFile(FILE);
    }

    if (!FILE || process.argv.includes("-i")) {
      await repl();
    }
  } catch (ex) {
    if (ex.span) {
      const span = ex.span as Span;
      engine.printSpan(span);
      console.error(ex.message);
    }
    // console.log(engine.getStackTrace());
  }
}

main().catch(console.error);

// abc
// acb
// bac
// bca
// cab
// cba
