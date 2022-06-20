import { Value } from "./value";

type Frame = Map<string, Value>;

type Optional<T> = T | undefined;

export class Context {
  public parentContext?: Context;
  public frames: Frame[] = [new Map()];

  private getFrame(key: string): Optional<Frame> {
    for (let i = this.frames.length - 1; i >= 0; i -= 1) {
      const frame = this.frames[i];
      if (frame.has(key)) {
        return frame;
      }
    }
    const parent = this.parentContext?.getFrame(key);
    return parent;
  }

  public get topFrame(): Frame {
    return this.frames[this.frames.length - 1];
  }

  public get(key: string): Optional<Value> {
    return this.getFrame(key)?.get(key);
  }

  public set(key: string, value: Value) {
    const frame = this.getFrame(key) ?? this.topFrame;
    frame.set(key, value);
  }

  public define(key: string, value: Value) {
    this.topFrame.set(key, value);
  }

  public descend() {
    this.frames.push(new Map());
  }

  public ascend(): Optional<Frame> {
    return this.frames.pop();
  }

  private getSnapshotFrames(): Frame[] {
    const output = this.parentContext?.getSnapshotFrames() ?? [];
    return output.concat(this.frames);
  }

  public getSnapshot(): Context {
    const context = new Context();
    context.frames = this.getSnapshotFrames();
    return context;
  }
}
