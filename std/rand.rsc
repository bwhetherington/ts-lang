let A = 1664525;
let C = 1013904223;
let M = 4294967296;

pub class Rng : Iterator {
  init(seed) {
    self.current_ = seed % M
    self.next()
  }

  next() {
    self.current_ = (A * self.current_ + C) % M
    return self.current_ / M
  }

  ints(min, max) {
    return self.map((r) => floor(r * (max - min)) + min)
  }
}

pub func rng() {
  return new Rng(time())
}

let GLOBAL_RNG = rng()

pub func random() {
  return GLOBAL_RNG.next()
}

pub func rand_int(low, high) {
  return GLOBAL_RNG.ints(low, high).next()
}

func max(a, b) {
  if b > a {
    return b
  } else {
    return a
  }
}

func min(a, b) {
  if b < a {
    return b
  } else {
    return a
  }
}

pub func advantage_rolls() {
  let seed = time()
  let a = new Rng(seed).ints(1, 21)
  let b = new Rng(seed + 1).ints(1, 2)
  return a.zip_with(b, max)
}

pub func disadvantage_rolls() {
  let seed = time()
  let a = new Rng(seed).ints(1, 21)
  let b = new Rng(seed + 1).ints(1, 21)
  return a.zip_with(b, min)
}