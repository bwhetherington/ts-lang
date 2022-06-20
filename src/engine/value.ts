import { Spread, Statement } from "../parser/parser";
import { Context } from "./context";

export enum ValueKind {
  Number = "Number",
  Boolean = "Boolean",
  String = "String",
  Object = "Object",
  None = "None",
  Builtin = "Builtin",
  Function = "Function",
  List = "List",
}

export type Value =
  | {
      kind: ValueKind.Number;
      value: number;
    }
  | {
      kind: ValueKind.Boolean;
      value: boolean;
    }
  | {
      kind: ValueKind.String;
      value: string;
    }
  | {
      kind: ValueKind.Object;
      value: ObjectValue;
    }
  | {
      kind: ValueKind.None;
    }
  | {
      kind: ValueKind.Builtin;
      value(...args: Value[]): Value;
    }
  | {
      kind: ValueKind.Function;
      value: {
        params: Spread<string[]>;
        context: Context;
        body: Statement[];
      };
    }
  | {
      kind: ValueKind.List;
      value: Value[];
    };

type IntoValue =
  | number
  | boolean
  | string
  | Array<IntoValue>
  | undefined
  | null
  | ((...args: Value[]) => Value)
  | { [key: string]: IntoValue };

export function intoValue(v: IntoValue): Value {
  if (v instanceof Array) {
    return {
      kind: ValueKind.List,
      value: v.map(intoValue),
    };
  }
  if (v === null || v === undefined) {
    return NONE;
  }
  switch (typeof v) {
    case "number":
      return {
        kind: ValueKind.Number,
        value: v,
      };
    case "boolean":
      return {
        kind: ValueKind.Boolean,
        value: v,
      };
    case "string":
      return {
        kind: ValueKind.String,
        value: v,
      };
    case "function":
      return {
        kind: ValueKind.Builtin,
        value: v,
      };
    case "object":
      return {
        kind: ValueKind.Object,
        value: ObjectValue.from(v),
      };
  }
}

type Optional<T> = T | undefined;

function listToString(list: Value[]): string {
  const inner = list.map(valueToString).join(",");
  return `[${inner}]`;
}

export function valueToString(value: Value): string {
  switch (value.kind) {
    case ValueKind.None:
      return "None";
    case ValueKind.Boolean:
      if (value.value) {
        return "True";
      } else {
        return "False";
      }
    case ValueKind.Number:
      return value.value.toString();
    case ValueKind.String:
      return `"${value.value}"`;
    case ValueKind.Builtin:
      return "<Builtin>";
    case ValueKind.Function:
      return "<Function>";
    case ValueKind.Object:
      return value.value.toString();
    case ValueKind.List:
      return listToString(value.value);
  }
}

export class ObjectValue {
  public proto?: ObjectValue;
  private data: Map<string, Value> = new Map();

  public static create(parent?: ObjectValue): ObjectValue {
    const obj = new ObjectValue();
    obj.proto = parent;
    return obj;
  }

  public static from(obj: { [key: string]: IntoValue }): ObjectValue {
    const objVal = new ObjectValue();
    for (const [key, value] of Object.entries(obj)) {
      objVal.set(key, intoValue(value));
    }
    return objVal;
  }

  public copy(): ObjectValue {
    const obj = ObjectValue.create(this.proto);
    for (const [key, value] of this.data) {
      obj.set(key, value);
    }
    return obj;
  }

  private shallowCopy(): ObjectValue {
    const newObj = new ObjectValue();
    newObj.proto = this.proto;
    newObj.data = this.data;
    return newObj;
  }

  public getSuper(): Optional<ObjectValue> {
    if (this.proto) {
      const obj = ObjectValue.create(this.proto.proto);
      obj.data = this.data;
      return obj;
    }
  }

  public get(key: string): Optional<Value> {
    const existing = this.data.get(key);
    if (existing === undefined) {
      return this.proto?.get(key);
    }
    return existing;
  }

  public set(key: string, value: Value) {
    this.data.set(key, value);
  }

  public delete(key: string) {
    this.data.delete(key);
  }

  public toString(): string {
    let out = "{";
    for (const [field, value] of this.data) {
      if (out.length > 1) {
        out += ",";
      }
      out += field + ":" + valueToString(value);
    }
    if (this.proto) {
      if (out.length > 1) {
        out += ",";
      }
      out += "proto:" + this.proto.toString();
    }
    return out + "}";
  }
}

export function compareValues(a: Value, b: Value): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === ValueKind.None || b.kind === ValueKind.None) {
    return true;
  }
  return a.value === b.value;
}

export const TRUE: Value = {
  kind: ValueKind.Boolean,
  value: true,
};

export const FALSE: Value = {
  kind: ValueKind.Boolean,
  value: false,
};

export const ZERO: Value = {
  kind: ValueKind.Number,
  value: 0,
};

export const ONE: Value = {
  kind: ValueKind.Number,
  value: 1,
};

export const NONE: Value = {
  kind: ValueKind.None,
};
