const dataSymbol = Symbol('path-store-trunk')

// Overall strategy:  Keep a tree that represents potential paths through the
// object.  Each tree node is a Map with a Symbol key that corresponds to the
// value stored at the path terminating at this node.  All the other keys refer
// to further nodes in the path.  The data key being a symbol ensures the
// user-provided keys cannot collide with it.

//
// This class represents the external API
//

class ArrayKeyedMap {
  constructor (initialEntries = []) {
    this._root = new Map()
    this._size = 0
    for (const [k, v] of initialEntries) { this.set(k, v) }
  }

  set (path, value) { set(path, value, this._root, this) }

  has (path) { return has(path, this._root, this) }

  get (path) { return get(path, this._root, this) }

  delete (path) { del(path, this._root, this) }

  get size () { return this._size }

  clear () {
    this._root.clear()
    this._size = 0
  }

  hasPrefix (path) { return hasPrefix(path, this._root, this) }

  get [Symbol.toStringTag] () { return 'ArrayKeyedMap' }

  * [Symbol.iterator] () { yield * entries([], this._root) }

  * entries () { yield * entries([], this._root) }

  * keys () { yield * keys(this._root) }

  * values () { yield * values(this._root) }

  forEach (callback, thisArg) { forEach(this._root, callback, thisArg, this) }
}

module.exports = ArrayKeyedMap

//
// These stateless functions implement the internals
//

const set = (path, value, store, main) => {
  switch (path.length) {
    case 0:
      if (!store.has(dataSymbol)) main._size += 1
      store.set(dataSymbol, value)
      break
    default: {
      const [next, ...rest] = path
      let nextStore = store.get(next)
      if (!nextStore) {
        nextStore = new Map()
        store.set(next, nextStore)
      }
      set(rest, value, nextStore, main)
      break
    }
  }
}

const has = (path, store, main) => {
  switch (path.length) {
    case 0:
      return store.has(dataSymbol)
    default: {
      const [next, ...rest] = path
      const nextStore = store.get(next)
      if (nextStore) {
        return has(rest, nextStore, main)
      } else {
        return false
      }
    }
  }
}

const get = (path, store, main) => {
  switch (path.length) {
    case 0:
      return store.get(dataSymbol)
    default: {
      const [next, ...rest] = path
      const nextStore = store.get(next)
      return nextStore ? get(rest, nextStore, main) : undefined
    }
  }
}

const del = (path, store, main) => {
  switch (path.length) {
    case 0:
      store.delete(dataSymbol)
      main._size -= 1
      break
    default: {
      const [next, ...rest] = path
      const nextStore = store.get(next)
      // Since the path is longer than 0, there must be a next store
      del(rest, nextStore, main)
      // If the next store is now empty, prune it
      if (!nextStore.size) {
        store.delete(next)
      }
      break
    }
  }
}

const hasPrefix = (path, store) => {
  switch (path.length) {
    case 0:
      return true
    default: {
      const [next, ...rest] = path
      const nextStore = store.get(next)
      return nextStore ? hasPrefix(rest, nextStore) : false
    }
  }
}

const entries = function * (path, store) {
  for (const [key, value] of store) {
    if (key === dataSymbol) yield [path, value]
    else {
      yield * entries(path.concat([key]), value)
    }
  }
}

const keys = function * (store) {
  for (const [k] of entries([], store)) yield k
}

const values = function * (store) {
  for (const [, v] of entries([], store)) yield v
}

const forEach = (store, callback, thisArg, main) => {
  for (const [k, v] of entries([], store)) callback.call(thisArg, v, k, main)
}
