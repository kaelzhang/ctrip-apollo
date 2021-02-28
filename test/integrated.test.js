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
let abaz

const appId = 'foo'

const create = (options = {}) => apollo({
  appId,
  host,
  ...options
})

test.before(async () => {
  port = await getPort()
  host = `http://127.0.0.1:${port}`

  // Default testing
  // - no cache
  // - with update notification
  // - no fetch
  app = create()

  baz = app.namespace('baz')
})

test.serial('request error', async t => {
  await t.throwsAsync(() => baz.ready(), {
    code: 'FETCH_REQUEST_ERROR'
  })

  const baz2 = create({
    skipInitFetchIfCacheFound: true
  })
  .namespace('baz')

  await t.throwsAsync(() => baz2.ready(), {
    code: 'NO_CACHE_SPECIFIED'
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
const clusterKey2 = 'portal.elastic.cluster.name2'

const clusterName = 'hermes-es-jp'
const clusterName2 = 'hermes-es-nl'

test.serial('after set: foo.default.baz', async t => {
  abaz = superAdmin
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

    abaz.set(clusterKey, clusterName2)
    .publish()
  })
})

test.serial('fetch nocache/cache with no change', async t => {
  await baz.fetch(false)
  await baz.fetch(true)
  t.pass()
})

test.serial('add a new config', async t => {
  t.is(baz.has(clusterKey2), false)

  const oldConfigBak = baz.config()

  await new Promise((resolve, reject) => {
    let oldConfigGot

    baz.once('add', ({
      key,
      value
    }) => {
      if (oldConfigGot) {
        return reject(
          new Error('updated event emitted before add')
        )
      }

      t.deepEqual(baz.get(clusterKey), clusterName2)
      t.is(key, clusterKey2)
      t.is(value, clusterName)
      t.is(baz.has(clusterKey2), true)

      resolve()
    })

    baz.once('updated', ({
      oldConfig,
      newConfig
    }) => {
      oldConfigGot = oldConfig

      t.deepEqual(oldConfig, oldConfigBak)
      t.false(clusterKey2 in oldConfig)
      t.deepEqual(newConfig, {
        [clusterKey]: clusterName2,
        [clusterKey2]: clusterName
      })
    })

    abaz.set(clusterKey2, clusterName)
    .publish()
  })
})

test.serial('delete key', async t => {
  await new Promise(resolve => {
    baz.once('delete', ({
      key,
      value
    }) => {
      t.deepEqual(baz.get(clusterKey), clusterName2)
      t.is(key, clusterKey2)
      t.is(value, clusterName)
      t.is(baz.has(clusterKey2), false)

      resolve()
    })

    abaz.delete(clusterKey2)
    .publish()
  })
})

test.serial('disabled notification', async t => {
  app.cluster().enableUpdateNotification(false)

  await new Promise(resolve => {
    baz.once('change', () => {
      t.fail('should not receive change event')
    })

    setTimeout(() => {
      t.pass()
      baz.removeAllListeners()
      resolve()
    }, POLLING_TIMEOUT)

    // Set back to clusterName
    abaz.set(clusterKey, clusterName)
    .publish()
  })
})

test.serial('could enable notification again', async t => {
  await new Promise(resolve => {
    baz.once('change', ({
      key,
      oldValue,
      newValue
    }) => {
      t.deepEqual(baz.get(clusterKey), clusterName)
      t.is(key, clusterKey)
      t.is(oldValue, clusterName2)
      t.is(newValue, clusterName)

      resolve()
    })

    app.cluster().enableUpdateNotification(true)
  })
})
