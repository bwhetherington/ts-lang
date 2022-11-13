export default `
Function.curry = (...curried) => {
  let f = self
  return (...args) => f(...curried, ...args)
}

List.sum = () => self.iter().fold(0, (sum, x) => sum + x)
List.product = () => self.iter().fold(1, (product, x) => product * x)
List.equals = (other) => {
  let len = self.len()
  if len != other.len() {
    return False
  }
  for i in Range.new(0, len) {
    let a = self[i]
    let b = other[i]
    if a != b {
      return False
    }
  }
  return True
}

List.with_size = (f, num) => {
  let res = []
  for i in Range.new(0, num) {
    res.push(f())
  }
  return res
}
`;
