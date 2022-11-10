import { Spread } from "./parser";
import { SpanData } from "./util";

export enum TypeKind {
  Identifier = "Identifier",
  Generic = "Generic",
  Interface = "Interface",
  Function = "Function",
  Class = "Class",
  Number = "Number",
  Boolean = "Boolean",
  String = "String",
  Any = "Any",
  None = "None",
}

export type TypeData =
  | {
    kind: TypeKind.Identifier;
    data: string;
  }
  | {
    kind: TypeKind.Generic;
    data: {
      subject: Type;
      arguments: Type[];
    }
  }
  | {
    kind: TypeKind.Interface;
    data: Record<string, Type>;
  }
  | {
    kind: TypeKind.Function;
    data: {
      parameters: Type[];
      output: Type; 
    }
  }
  | {
    kind: TypeKind.Class;
    data: {
      fields: Record<string, Type>;
      parent: Type;
    }
  }
  | {
    kind: TypeKind.Number;
  }
  | {
    kind: TypeKind.Boolean;
  }
  | {
    kind: TypeKind.String;
  }
  | {
    kind: TypeKind.Any;
  }
  | {
    kind: TypeKind.None;
  }

export type Type = SpanData<TypeData>;

export const PRIMITIVE_TYPES: Record<string, TypeData> = {
  number: {
    kind: TypeKind.Identifier,
    data: 'Number',
  },
  boolean: {
    kind: TypeKind.Identifier,
    data: 'Boolean',
  },
  none: {
    kind: TypeKind.Identifier,
    data: 'None',
  },
  any: {
    kind: TypeKind.Identifier,
    data: 'Any',
  },
};