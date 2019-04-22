const test = require('ava')
const getPort = require('get-port')

const apollo = require('../src')

const {
  superAdmin,
  listen
} = require('./prepare')

const POLLING_TIMEOUT = 2000

let host
let port
let app
let baz

const appId = 'foo'

test.before(async () => {
  port = await getPort()
  host = `http://127.0.0.1:${port}`

  // Default testing
  // - no cache
  // - with update notification
  // - no fetch
  app = apollo({
    appId,
    host
  })

  baz = app.namespace('baz')
})

test.serial('request error', async t => {
  await t.throwsAsync(() => baz.ready(), {
    code: 'FETCH_REQUEST_ERROR'
  })

  await listen(POLLING_TIMEOUT, port)
})

test.serial('status 404, not found', async t => {
  try {
    await baz.ready()
  } catch (error) {
    t.is(error.code, 'FETCH_STATUS_ERROR')
    t.deepEqual(error.codes, ['FETCH_STATUS_ERROR', 'NO_CACHE_SPECIFIED'])
    return
  }

  t.fail('should fail')
})

const clusterKey = 'portal.elastic.cluster.name'
const clusterName = 'hermes-es-jp'
const clusterName2 = 'hermes-es-nl'

test.serial('after set: foo.default.baz', async t => {
  superAdmin
  .app('foo')
  .cluster('default')
  .namespace('baz')
  .set(clusterKey, clusterName)
  .publish()

  t.throws(() => baz.get(clusterKey), {
    code: 'NOT_READY'
  }, 'not ready')

  await baz.ready()

  t.is(baz.get(clusterKey), clusterName, 'cluster name not match')
})

test.serial('config', async t => {
  t.deepEqual(baz.config(), {
    'portal.elastic.cluster.name': 'hermes-es-jp'
  })
})

test.serial('notifications, and change event for namespace', async t => {
  await new Promise(resolve => {
    baz.once('change', ({
      key,
      oldValue,
      newValue
    }) => {
      t.deepEqual(baz.get(clusterKey), clusterName2)
      t.is(key, clusterKey)
      t.is(oldValue, clusterName)
      t.is(newValue, clusterName2)

      resolve()
    })

    superAdmin
    .app('foo')
    .cluster('default')
    .namespace('baz')
    .set(clusterKey, clusterName2)
    .publish()
  })
})

test.serial('fetch with no cache no change', async t => {
  await baz.fetch(false)
  t.pass()
})
