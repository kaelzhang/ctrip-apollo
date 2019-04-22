const {parse} = require('url')
const path = require('path')

const apollo = require('..')

const {APOLLO_HOST} = process.env

if (!parse(APOLLO_HOST).host) {
  throw new TypeError('process.env.APOLLO_HOST must be a valid url')
}

const app = apollo({
  host: APOLLO_HOST,
  appId: process.env.APOLLO_APPID || 'fe-common',
  cachePath: path.join(__dirname, '.cache')
})

/* eslint-disable no-console */
const ns = app
.cluster(process.env.APOLLO_CLUSTER || 'default')
.namespace(process.env.APOLLO_NAMESPACE || 'application')
.on('fetch-error', console.error)
.on('change', e => {
  console.log('change', e)
})

const run = async () => {
  await ns.ready()
  console.log('all configurations', ns.config())
}

run().catch(err => {
  console.log('code', err.code)
  console.log(err.stack)
})
