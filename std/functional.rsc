let map = import("./map.rsc")

pub func compose(f, g) {
  return (...xs) => f(g(...xs))
}

pub func memoize(f) {
  let cache = new map.Map()
  return (...xs) => {
    let res = cache[xs]
    if res == None {
      res = f(...xs)
      cache[xs] = res
    }
    return res
  }
}