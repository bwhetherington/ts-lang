pub class Box {
  init(val) {
    self.val_ = val
  }

  get() {
    return self.val_
  }

  set(val) {
    let prev = self.get()
    self.val_ = val
    return prev
  }
}