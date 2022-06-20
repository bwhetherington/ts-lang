export default `
pub func print(...xs) {
  __print__(...xs)
}

pub func println(...xs) {
  print(...xs)
  __print__("\n")
}
`;
