const apollo = require('..')

const host = 'http://localhost:8070'
const appId = 'apollo'

const options = {
  host,
  appId
}

const create = opts => apollo(Object.assign({}, options, opts))

module.exports = {
  create,
  options
}
