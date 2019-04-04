const test = require('ava')
const apollo = require('..')

const host = 'http://localhost:8070'
const appId = 'apollo'

const CASES = [
  [null, 'INVALID_OPTIONS'],
  [{
    host: 1
  }, 'INVALID_HOST'],
  [{
    host,
    appId: 1
  }, 'INVALID_APPID']
]

CASES.forEach(([options, code]) => {
  test(`${JSON.stringify(options)}: error code: ${code}`, t => {
    t.throws(() => apollo(options), {code})
  })
})
