const test = require('ava')
const apollo = require('../src')

const {
  superAdmin,
  prepare
} = require('./prepare')

let host
let app
const appId = 'foo'

test.before(async () => {
  host = await prepare(2000)

  // Default testing
  // - no cache
  // - with update notification
  // - no fetch
  app = apollo({
    appId,
    host
  })
})

test.serial('status 404, not found', async t => {
  const namespace = app.namespace('baz')

  try {
    await namespace.ready()
  } catch (error) {
    t.is(error.code, 'FETCH_STATUS_ERROR')
    t.deepEqual(error.codes, ['FETCH_STATUS_ERROR', 'NO_CACHE_SPECIFIED'])
    return
  }

  t.fail('should fail')
})

test.serial('after set: foo.default.baz', async t => {
  const clusterKey = 'portal.elastic.cluster.name'
  const clusterName = 'hermes-es-jp'

  superAdmin
  .app('foo')
  .cluster('default')
  .namespace('baz')
  .set(clusterKey, clusterName)
  .publish()

  const namespace = app
  .namespace('baz')

  t.throws(() => namespace.get(clusterKey), {
    code: 'NOT_READY'
  }, 'not ready')

  await namespace.ready()

  t.is(namespace.get(clusterKey), clusterName, 'cluster name not match')
})

// test.serial('default notifications', async t => {

// })
