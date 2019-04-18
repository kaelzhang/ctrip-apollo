const log = require('util').debuglog('ctrip-apollo')

const {ApolloNamespace} = require('./namespace')
const {Polling} = require('./polling')
const {Base} = require('./util')
const {DEFAULT_NAMESPACE} = require('./options')

class ApolloCluster extends Base {
  constructor (options) {
    super(options, ApolloNamespace, 'namespace', 'INVALID_NAMESPACE_NAME')

    const {
      host,
      appId,
      cluster
    } = this._options

    const polling = this._polling = new Polling({
      host,
      appId,
      cluster
    })

    polling.on('update', namespace => {
      if (namespace !== this._options.namespace) {
        log('client: skip initial polling update')
        return
      }

      log('client: receive update, start to fetch with no cache')

      // Always fetch non-cached configurations when received update event,
      // because we need to fetch the latest configs
      this._child(namespace).fetch(false)
    })
  }

  get cluster () {
    return this._options.cluster
  }

  namespace (namespace = DEFAULT_NAMESPACE) {
    const child = this._child(namespace)

    child.once('ready', () => {
      this._polling.addNamespace(namespace)
    })

    return child
  }

  enableUpdateNotification (enable) {
    this._polling.enable(enable)

    return this
  }
}

module.exports = {
  ApolloCluster
}
