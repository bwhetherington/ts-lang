export default `
pub let Class = {
  __name__: "Class",
  create() {
    return create_object(self, {})
  },
  init() {},
  new(...args) {
    let instance = self.create()
    instance.init(...args)
    return instance
  },
}

pub func __define_class__(NewClass, name) {
  let proto = create_object(Class, NewClass)
  proto.__name__ = name
  return proto
}

pub func __extend_class__(Base, NewClass, name) {
  let proto = create_object(Base, NewClass)
  proto.__name__ = name
  return proto
}
`;

/*
pub func __extend_class__(Base, NewClass) {
  return __define_class__(create_object(NewClass, {
    create() {
      let base_instance = create_object(Base, NewClass)
      return create_object(base_instance, {})
    },
  }))
}
*/
