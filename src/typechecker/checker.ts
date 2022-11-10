import { Type, TypeKind } from "../parser/types";

export class TypeChecker {
  private types: Map<string, Type> = new Map();

  private initialize() {
    // this.types = new Map<string, Type>([
    //   ["Number", {kind: TypeKind.Number}]
    // ]);
  }

  private defineType(name: string, type: Type) {
    this.types.set(name, type);
  }

  private matchesType(subject: Type, target: Type): boolean {
    switch (target.data.kind) {
      case TypeKind.Any:
        return true;
      case TypeKind.None:
      case TypeKind.Number:
      case TypeKind.Boolean:
      case TypeKind.String:
        return subject.data.kind === target.data.kind;
      case TypeKind.Function:
        return true;
    }
    return true;
  }
}
