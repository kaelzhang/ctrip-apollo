const path = require('path')
const log = require('util').debuglog('ctrip-apollo:test')
const test = require('ava')
const delay = require('delay')
const fs = require('fs-extra')

const apollo = require('../src')

const {
  superAdmin,
  prepare
} = require('./prepare')

const appId = 'foo-cache'

let config
let host

const POLLING_TIMEOUT = 1000

const clusterKey = 'portal.elastic.cluster.name'
const clusterName = 'hermes-es-jp'

const create = (options = {}) => apollo({
  host,
  appId,
  cachePath: path.join(__dirname, '.cache'),
  enableUpdateNotification: false,
  enableFetch: false,
  ...options
})
.cluster('bar')
.namespace('baz')

test.before(async () => {
  ({
    config,
    host
  } = await prepare(POLLING_TIMEOUT))

  superAdmin
  .app(appId)
  .cluster('bar')
  .namespace('baz')
  .set(clusterKey, clusterName)
  .publish()
})

test.serial('fetch json error', async t => {
  config.enableFetchError(true)

  const baz = create()

  await t.throwsAsync(() => baz.ready(), {
    code: 'JSON_PARSE_ERROR'
  })

  config.enableFetchError(false)
})

test.serial('fetch error', async t => {
  config.enableFetch(false)

  const baz = create()

  await t.throwsAsync(() => baz.ready(), {
    code: 'FETCH_STATUS_ERROR'
  })

  const baz2 = create({
    skipInitFetchIfCacheFound: true
  })

  await t.throwsAsync(() => baz2.ready(), {
    code: 'NO_LOCAL_CACHE_FOUND'
  })

  /* eslint-disable no-underscore-dangle */
  await fs.outputFile(baz2._cacheFile, '{boooooooooom!}')

  await t.throwsAsync(() => baz2.ready(), {
    code: 'READ_LOCAL_CACHE_FAILS'
  })

  config.enableFetch(true)
})

test.serial('read from cache', async t => {
  await create().ready()
  await delay(100)

  config.enableFetch(false)

  const baz = create()
  await baz.ready()
  t.is(baz.get(clusterKey), clusterName)

  config.enableFetch(false)

  const baz2 = create({
    skipInitFetchIfCacheFound: true
  })
  await baz2.ready()
  t.is(baz2.get(clusterKey), clusterName)
})

test.serial('direct fetch error', async t => {
  const baz = create()
  await baz.ready()

  config.enableFetch(false)

  await new Promise(resolve => {
    baz.once('fetch-error', err => {
      t.is(err.code, 'FETCH_STATUS_ERROR')
      resolve()
    })

    baz.fetch(true)
  })

  config.enableFetch(true)
})

test.serial('save error', async t => {
  const cachePath = path.join(__dirname, '.cache', 'not-a-dir')
  await fs.outputFile(cachePath, 'a')

  await new Promise(resolve => {
    const baz = create({
      cachePath
    })

    baz.on('save-error', err => {
      log('save-error: %s', err.message)
      t.pass()
      resolve()
    })

    baz.ready().catch(err => {
      t.fail(err.message)
    })
  })
})
