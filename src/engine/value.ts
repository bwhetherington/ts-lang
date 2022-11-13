import { Spread, Statement } from "../parser/parser";
import { Context } from "./context";

export enum ValueKind {
  Number,
  Boolean,
  String,
  Object,
  None,
  Builtin,
  Function,
  List,
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

  public *entries(): Iterable<[string, Value]> {
    yield* this.data.entries();
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

  private instanceOfObject(other: ObjectValue) {
    if (this.proto === undefined) {
      return false;
    }
    return (
      this.proto === other || (this.proto?.instanceOfObject(other) ?? false)
    );
  }

  public instanceOf(other: Value): boolean {
    if (other.kind !== ValueKind.Object) {
      return false;
    }
    return this.instanceOfObject(other.value);
  }

  public getSuper(): Optional<ObjectValue> {
    if (this.proto) {
      const obj = ObjectValue.create(this.proto.proto);
      obj.data = this.data;
      return obj;
    }
  }

  private shallowGet(key: string): Optional<Value> {
    return this.data.get(key);
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
    const nameTag = this.shallowGet("__name__");
    if (nameTag?.kind === ValueKind.String) {
      return nameTag.value;
    }
    let out = "";
    if (this.proto) {
      out += this.proto.toString();
    }
    out += "{";
    let fieldsDefined = 0;
    for (const [field, value] of this.data) {
      if (fieldsDefined > 0) {
        out += ",";
      }
      out += field + ":" + valueToString(value);
      fieldsDefined += 1;
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
