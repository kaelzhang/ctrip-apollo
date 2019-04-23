const test = require('ava')
const apollo = require('..')
const {options} = require('./create')

const {
  host,
  appId
} = options

const CASES = [
  [null, 'INVALID_OPTIONS'],
  [{
    host: 1
  }, 'INVALID_HOST'],
  [{
    host,
    appId: 1
  }, 'INVALID_APPID'],
  [options, 'INVALID_CLUSTER_NAME', opts => apollo(opts).cluster(1)],
  [{
    host,
    appId
  }, 'INVALID_NAMESPACE_NAME', opts => apollo(opts).namespace(1)],
  [{
    host,
    appId
  }, 'INVALID_NAMESPACE_TYPE', opts =>
    apollo(opts).namespace('application', 'TEXT')]
]

CASES.forEach(([opts, code, runner = apollo]) => {
  test(`${JSON.stringify(opts)}: error code: ${code}`, t => {
    t.throws(() => runner(opts), {code})
  })
})
