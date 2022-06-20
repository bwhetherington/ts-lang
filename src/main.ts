import { evalExpr, ExpressionKind, Parser } from "./parser/parser";
import * as fs from "fs/promises";
import { filterComments, getSpanPos, ParseError, Span } from "./parser/util";
import { Engine, State } from "./engine/engine";
import { repl } from "./repl";
import { intoValue, ObjectValue } from "./engine/value";

// Error.stackTraceLimit = 100;

const FILE = process.argv[2] ?? "test.rsc";

async function main() {
  const src = await fs.readFile(FILE, "utf-8");

  const engine = new Engine();
  try {
    engine.init();
    engine.executeModule(FILE, src);
  } catch (ex) {
    if (ex.span) {
      const span = ex.span as Span;
      engine.printSpan(span);
      console.error(ex.message);
    }
    console.log(engine.getStackTrace());
  }
}

async function main2() {
  await repl();
}

// main().catch(console.error);

function main3() {
  const proto = new ObjectValue();
  proto.set("foo", intoValue(10));

  const inter = ObjectValue.create(proto);
  inter.set("foo", intoValue(20));

  const obj = ObjectValue.create(inter);
  obj.set("bar", intoValue(30));

  console.log(obj);

  const sup = obj.getSuper();
  if (!sup) {
    return;
  }

  sup.set("bar", intoValue(40));
  console.log("super foo", sup.get("foo"));
  console.log("self foo", obj.get("foo"));

  console.log(obj);
}

// main3();
main().catch(console.error);

// abc
// acb
// bac
// bca
// cab
// cba
