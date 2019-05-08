const path = require('path')
const test = require('ava')
const delay = require('delay')

const apollo = require('../src')

const {
  superAdmin,
  prepare
} = require('./prepare')

const appId = 'foo-cache'

let host

const POLLING_TIMEOUT = 1000
const CONFIG_DELAY = 500

const clusterKey = 'portal.elastic.cluster.name'
const clusterName = 'hermes-es-jp'

const create = (options = {}) => apollo({
  host,
  appId,
  cachePath: path.join(__dirname, '.cache'),
  enableUpdateNotification: false,
  enableFetch: false,
  fetchTimeout: 100,
  ...options
})
.cluster('bar')
.namespace('baz')

test.before(async () => {
  ({
    host
  } = await prepare(POLLING_TIMEOUT, CONFIG_DELAY))

  superAdmin
  .app(appId)
  .cluster('bar')
  .namespace('baz')
  .set(clusterKey, clusterName)
  .publish()
})

test('fetch json timeout', async t => {
  const baz = create()

  await t.throwsAsync(() => baz.ready(), {
    code: 'FETCH_TIMEOUT'
  })

  await delay(CONFIG_DELAY)
})

test('fetch json not timeout', async t => {
  const baz = create({
    fetchTimeout: 600
  })

  await baz.ready()
  t.pass()
})
