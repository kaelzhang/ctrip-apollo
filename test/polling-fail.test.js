const test = require('ava')
const delay = require('delay')

const apollo = require('../src')
const opts = require('../src/options')

opts.ATOM_RETRY_DELAY = 10

const {
  superAdmin,
  prepare
} = require('./prepare')

const appId = 'foo-polling-fail'

let config
let host
let abaz

const POLLING_TIMEOUT = 50

const clusterKey = 'portal.elastic.cluster.name'
const clusterName = 'hermes-es-jp'
const clusterName2 = 'hermes-es-cn'

const createCluster = (options = {}) => apollo({
  host,
  appId,
  enableUpdateNotification: true,
  enableFetch: false,
  ...options
})
.cluster('bar')

test.before(async () => {
  ({
    config,
    host
  } = await prepare(POLLING_TIMEOUT))

  abaz = superAdmin
  .app(appId)
  .cluster('bar')
  .namespace('baz')
  .set(clusterKey, clusterName)
  .publish()
})

test.serial('notification error and disable', async t => {
  const cluster = createCluster()
  const baz = cluster.namespace('baz')
  await baz.ready()
  config.enableUpdateNotification(false)

  t.is(baz.get(clusterKey), clusterName)

  abaz.set(clusterKey, clusterName2)
  .publish()

  await delay(POLLING_TIMEOUT * 5)
  config.enableNotificationError(true)
  await delay(POLLING_TIMEOUT * 2)

  t.is(baz.get(clusterKey), clusterName, 'should be no change')

  config.enableNotificationError(false)
  config.enableUpdateNotification(true)
  await delay(POLLING_TIMEOUT * 5)

  t.is(baz.get(clusterKey), clusterName2, 'should change')
  cluster.enableUpdateNotification(false)
})

test.serial('retry policy, abandon instantly', async t => {
  const baz = createCluster({
    pollingRetryPolicy () {
      return {
        abandon: true
      }
    }
  })
  .namespace('baz')

  await baz.ready()
  t.is(baz.get(clusterKey), clusterName2)

  config.enableUpdateNotification(false)
  await delay(POLLING_TIMEOUT)
  // update notification polling abandoned instantly

  config.enableUpdateNotification(true)

  abaz.set(clusterKey, clusterName)
  .publish()

  await delay(POLLING_TIMEOUT)
  t.is(baz.get(clusterKey), clusterName2, 'should not change')
})
