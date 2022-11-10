export default `
/*
 * Dependencies:
 * - class.rsc
 */
/*
 * Dependencies:
 * - class.rsc
 */
pub class Iterator {
  next() {
    return None
  }

  iter() {
    return self
  }

  for_each(f) {
    for x in self {
      f(x)
    }
  }

  collect() {
    return [...self]
  }

  fold(initial, accumulator) {
    let val = initial
    for x in self {
      val = accumulator(val, x)
    }
    return val
  }

  filter(f) {
    return Filter.new(self, f)
  }
  map(f) {
    return Map.new(self, f)
  }
  flat_map(f) {
    return FlatMap.new(self, f)
  }
  skip(amount) {
    return Skip.new(self, amount)
  }
  enumerate() {
    return Enumerate.new(self)
  }
  take(amount) {
    return Take.new(self, amount)
  }
  take_while(f) {
    return TakeWhile.new(self, f)
  }
  zip_with(b, f) {
    return ZipWith.new(self, b.iter(), f)
  }
  zip(b) {
    return self.zip_with(b, zip_vals)
  }
}

pub class Range : Iterator {
  init(from, to) {
    super.init()
    self.from_ = from
    self.to_ = to
  }
  
  next() {
    if self.from_ < self.to_ {
      let i = self.from_
      self.from_ += 1
      return i
    }
  }
}

class Filter : Iterator {
  init(base, pred) {
    self.base_ = base
    self.pred_ = pred
  }

  next() {
    let val = self.base_.next()
    let cond = !((val == None) || self.pred_(val))
    while cond {
      val = self.base_.next()
    }
    return val
  }
}

class Map : Iterator {
  init(base, f) {
    super.init()
    self.base_ = base
    self.function_ = f
  }

  next() {
    let val = self.base_.next()
    if val != None {
      return self.function_(val)
    }
  }
}

class FlatMap : Iterator {
  init(base, f) {
    super.init()
    self.base_ = base
    self.function_ = f
    self.cur_iter_ = None
  }

  next() {
    // If we have a current subiterator
    let next = self.cur_iter_?.next?.()
    if next != None {
      return next
    }

    // Otherwise create a new one
    let nextbase_ = self.base_.next()
    if nextbase_ != None {
      let next_iter = self.function_(nextbase_)?.iter?.()
      self.cur_iter_ = next_iter
      return next_iter.next()
    }
  }
}

class Skip : Iterator {
  init(base, amount) {
    super.init()
    self.base_ = base
    for _ in new Range(0, amount) {
      base.next()
    }
  }

  next() {
    return self.base_.next()
  }
}

class Enumerate : Iterator {
  init(base) {
    super.init()
    self.base_ = base
    self.index_ = 0
  }

  next() {
    let val = self.base_.next()
    if val != None {
      let index = self.index_
      self.index_ += 1
      return {
        value: val,
        index: index,
      }
    }
  }
}

class TakeWhile : Iterator {
  init(base, f) {
    super.init()
    self.base_ = base
    self.function_ = f
    self.is_done_ = False
  }

  next() {
    if !self.is_done_ {
      let val = self.base_.next()
      if self.function_(val) {
        return val
      } else {
        self.is_done_ = True
      }
    }
  }
}

class Take : Iterator {
  init(base, num) {
    super.init()
    self.base_ = base
    self.amount_ = num
  }

  next() {
    if self.amount_ > 0 {
      self.amount_ -= 1
      return self.base_.next()
    }
  }
}

class Zip : Iterator {
  init(a, b) {
    self.iter_a_ = a
    self.iter_b_ = b
  }

  next() {
    let a = self.iter_a_.next()
    let b = self.iter_b_.next()
    if a != None && b != None {
      return [a, b]
    }
  }
}

class ZipWith : Iterator {
  init(a, b, f) {
    super.init()
    self.iter_a_ = a
    self.iter_b_ = b
    self.function_ = f
  }

  next() {
    let a = self.iter_a_.next()
    let b = self.iter_b_.next()
    if a != None && b != None {
      return self.function_(a, b)
    }
  }
}

func zip_vals(a, b) {
  return [a, b]
}

func list_iter(xs) {
  return Range.new(0, xs.len()).map((i) => xs[i])
}

List.iter = () => {
  return Range.new(0, self.len()).map((i) => self[i])
}
`;
