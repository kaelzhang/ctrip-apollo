const {isString} = require('core-util-is')
const {error} = require('./error')

const createKey = (...args) =>
  Buffer.from(args.join('|')).toString('base64')

class Base {
  constructor (options, Child, key, errorCode) {
    this._options = options
    this._Child = Child
    this._children = Object.create(null)
    this._errorCode = errorCode
    this._key = key
  }

  _child (name, init) {
    if (!isString(name)) {
      throw error(this._errorCode, name)
    }

    if (name in this._children) {
      return this._children[name]
    }

    const child = this._children[name] = new this._Child({
      ...this._options,
      [this._key]: name
    })

    init && init(child)

    return child
  }
}

module.exports = {
  createKey,
  Base
}
