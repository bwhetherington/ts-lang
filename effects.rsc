func generator() {
  let res = effect readFile("test.rsc");
  return res;
}

func call_generator() {
  use {
    generator();
  } with {
    
  }
}

func with_error(f) {
  use {
    f();
  } with {
    error(ex) {
      println(ex);
    }
  }
}

func with_log(f) {
  use {
    f();
  } with {
    log(line) {
      println(line);
      resume;
    }
  }
}

func with_fs(f) {
  use {
    f();
  } with {
    readFile(file) {
      // Do stuff
      return content;
    }
    readDir(dir) {
      return files;
    }
  }
}

with_log(() => {
  with_error(() => {
    with_fs(() => {
      let content = effect readFile("./test.rsc");
      effect log(content);
    });
  });
})