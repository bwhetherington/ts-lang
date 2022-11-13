import * as path from "path";

interface PathResolution {
  target: string;
  resolver: Resolver;
}

export class Resolver {
  public constructor(private root: string) {}

  public getFileName(): string {
    const info = path.parse(this.root);
    return `${info.name}.${info.ext}`;
  }

  public resolve(target: string): PathResolution {
    const norm = path.normalize(path.join(this.root, target));
    const dir = path.dirname(norm);
    return { target: norm, resolver: new Resolver(dir) };
  }
}
