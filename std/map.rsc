pub class Entry {
  init(key, value) {
    self.key = key
    self.value = value
  }

  get() {
    return self.value
  }

  set(value) {
    let prev = self.get()
    self.value = value
    return prev
  }
}

let INITIAL_CAPACITY = 8
let RATIO = 2 / 3

pub class Map {
  with_capacity(capacity) {
    let m = new Map()
    m.buckets_ = List.with_size(() => [], capacity)
    return m
  }

  init() {
    self.buckets_ = List.with_size(() => [], INITIAL_CAPACITY)
    self.size_ = 0
  }

  size() {
    return self.size_
  }

  get_bucket_index(key) {
    let hash = hash_code(key)
    return hash % self.buckets_.len()
  }

  get_bucket(key) {
    return self.buckets_[self.get_bucket_index(key)]
  }

  get_entry(key) {
    let bucket = self.get_bucket(key)

    // Search for existing entry
    for entry in bucket {
      if key == entry.key {
        return entry
      }
    }

    return None
  }

  has(key) {
    return self.get_entry(key) != None
  }

  remove(key) {
    let bucket_index = self.get_bucket_index(key)
    let new_bucket = []
    let was_removed = False
    for entry in self.buckets_[bucket_index] {
      if entry.key != key {
        new_bucket.push(entry)
      } else {
        was_removed = True
      }
    }
    self.buckets_[bucket_index] = new_bucket
    if was_removed {
      self.size_ -= 1
    }
    return was_removed
  }

  index_get(key) {
    return self.get_entry(key)?.value
  }
  
  index_set(key, value) {
    if self.get_inc_ratio_(1) > RATIO {
      self.resize_()
    }

    let entry = self.get_entry_or_insert(key)
    let prev = entry.set(value)
    return prev
  }

  get_entry_or_insert(key) {
    let bucket = self.get_bucket(key)

    // Search for existing entry
    for entry in bucket {
      if key == entry.key {
        return entry
      }
    }

    // Create new entry
    let entry = new Entry(key, None)
    bucket.push(entry)
    self.size_ += 1
    return entry
  }

  get_inc_ratio_(amount) {
    return (self.size_ + amount) / self.buckets_.len()
  }

  insert(entry) {
    self[entry.key] = entry.value
  }

  iter() {
    return new MapIterator(self)
  }

  values() {
    return self.iter().map((entry) => entry.value)
  }

  keys() {
    return self.iter().map((entry) => entry.key)
  }

  resize_(factor) {
    let new_map = Map.with_capacity(self.buckets_.len() * 2)
    for entry in self {
      new_map[entry.key] = entry.value
    }
    self.buckets_ = new_map.buckets_
  }

  to_string() {
    let entry_list = [...self.iter()]
    return self.__name__ + entry_list
  }
}

class MapIterator : Iterator {
  init(map) {
    self.map_ = map
    self.bucket_ = 0
    self.bucket_index_ = 0
  }

  is_not_last_bucket_() {
    return self.bucket_ < self.map_.buckets_.len()
  }

  get_bucket_(index) {
    return self.map_.buckets_[index]
  }

  next() {
    while self.is_not_last_bucket_() {
      let bucket = self.get_bucket_(self.bucket_)
      // Check if bucket has any items
      if self.bucket_index_ < bucket.len() {
        let entry = bucket[self.bucket_index_]
        self.bucket_index_ += 1
        return entry
      } else {
        self.bucket_index_ = 0
        self.bucket_ += 1
      }
    }
    return None
  }
}
