const test = require('ava')

const apollo = require('../src')

const {
  superAdmin,
  prepare
} = require('./prepare')

const appId = 'foo-cache'
const cluster = 'baz2'

let config
let host

const POLLING_TIMEOUT = 1000

const clusterKey = 'portal.elastic.cluster.name'
const clusterName = 'hermes-es-jp'

const create = (options = {}) => apollo({
  host,
  appId,
  enableUpdateNotification: false,
  enableFetch: false,
  ...options
})
.cluster(cluster)
.namespace('baz')

test.before(async () => {
  ({
    config,
    host
  } = await prepare(POLLING_TIMEOUT))

  superAdmin
  .app(appId)
  .cluster(cluster)
  .namespace('baz')
  .set(clusterKey, clusterName)
  .publish()
})

test('description', async t => {
  t.pass()
})
