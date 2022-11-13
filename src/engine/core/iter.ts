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
    return FilterIterator.new(self, f)
  }
  map(f) {
    return MapIterator.new(self, f)
  }
  flat_map(f) {
    return FlatMapIterator.new(self, f)
  }
  skip(amount) {
    return SkipIterator.new(self, amount)
  }
  enumerate() {
    return Enumerate.new(self)
  }
  take(amount) {
    return TakeIterator.new(self, amount)
  }
  take_while(f) {
    return TakeWhileIterator.new(self, f)
  }
  zip_with(b, f) {
    return ZipWithIterator.new(self, b.iter(), f)
  }
  zip(b) {
    return self.zip_with(b, zip_vals)
  }
  slice(from, to) {
    return self.skip(from).take(to - from)
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

class FilterIterator : Iterator {
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

class MapIterator : Iterator {
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

class FlatMapIterator : Iterator {
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

class SkipIterator : Iterator {
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

class EnumerateIterator : Iterator {
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

class TakeWhileIterator : Iterator {
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

class TakeIterator : Iterator {
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

class ZipIterator : Iterator {
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

class ZipWithIterator : Iterator {
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

class FunctionIterator : Iterator {
  init(fn) {
      self.fn_ = fn
      self.is_done_ = False
  }

  next() {
      if self.is_done_ {
          return None
      }
      let res = self.fn_()
      self.is_done_ = res == None
      return res
  }
}

func zip_vals(a, b) {
  return [a, b]
}

func list_iter(xs) {
  return Range.new(0, xs.len()).map((i) => xs[i])
}

class ListIterator : Iterator {
  init(list) {
    self.list_ = list
    self.index_ = 0
  }

  next() {
    if self.index_ < self.list_.len() {
      let val = self.list_[self.index_]
      self.index_ += 1
      return val
    }
  }
}

List.iter = () => {
  return ListIterator.new(self)
}

Function.iter = () => {
  return FunctionIterator.new(self)
}
`;
