const test = require('ava')

const apollo = require('..')

test('default retry policy', t => {
  t.is(typeof apollo.DEFAULT_POLLING_RETRY_POLICY, 'function')
})

test('available options', t => {
  t.true(Array.isArray(apollo.AVAILABLE_OPTIONS))
})
