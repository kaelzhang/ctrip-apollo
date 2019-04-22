const test = require('ava')
const apollo = require('..')

const {
  superAdmin,
  prepare
} = require('./prepare')

let host
let app
const appId = 'foo'

test.before(async () => {
  host = await prepare(2000)
  app = apollo({
    appId,
    host
  })
})

test('status 404, not found', async t => {
  const namespace = app.namespace('baz')

  await t.throwsAsync(() => namespace.ready(), {
    code: 'FETCH_STATUS_ERROR',
    // codes: ['FETCH_STATUS_ERROR', 'NO_CACHE_SPECIFIED']
  })
})
