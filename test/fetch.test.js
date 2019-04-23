const test = require('ava')
const delay = require('delay')

const apollo = require('../src')

const {
  superAdmin,
  prepare
} = require('./prepare')

const appId = 'foo-fetch'
const cluster = 'baz2'

let host
let abaz

const POLLING_TIMEOUT = 1000
const FETCH_INTERVAL = 500

const clusterKey = 'portal.elastic.cluster.name'
const clusterName = 'hermes-es-jp'
const clusterName2 = 'hermes-es-cn'

const create = (options = {}) => apollo({
  host,
  appId,
  enableUpdateNotification: false,
  enableFetch: false,
  fetchInterval: FETCH_INTERVAL,
  ...options
})
.cluster(cluster)
.namespace('baz')

test.before(async () => {
  ({
    host
  } = await prepare(POLLING_TIMEOUT))

  abaz = superAdmin
  .app(appId)
  .cluster(cluster)
  .namespace('baz')
  .set(clusterKey, clusterName)
  .publish()
})

test.serial('enable fetch', async t => {
  const baz = create()
  await baz.ready()
  baz.enableFetch(true)

  abaz.set(clusterKey, clusterName2)
  .publish()

  await delay(FETCH_INTERVAL + 100)

  t.is(baz.get(clusterKey), clusterName2)
})

test.serial('enable fetch before ready', async t => {
  const baz = create()
  baz.enableFetch(true)

  await baz.ready()

  abaz.set(clusterKey, clusterName)
  .publish()

  await delay(FETCH_INTERVAL + 100)

  t.is(baz.get(clusterKey), clusterName)

  baz.enableFetch(false)
  baz.enableFetch(false)
  abaz.set(clusterKey, clusterName2)

  await delay(FETCH_INTERVAL + 100)

  t.is(baz.get(clusterKey), clusterName)
})
