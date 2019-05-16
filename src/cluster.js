const log = require('util').debuglog('ctrip-apollo')

const {ApolloNamespace} = require('./namespace')
const {Polling} = require('./polling')
const {Base} = require('./util')
const {
  DEFAULT_NAMESPACE_TYPE,
  checkNamespaceType,
  setDefault
} = require('./options')

class ApolloCluster extends Base {
  constructor (options) {
    super(options, ApolloNamespace, 'namespace', 'INVALID_NAMESPACE_NAME')

    const {
      host,
      appId,
      cluster,
      pollingRetryPolicy
    } = this._options

    const polling = this._polling = new Polling({
      host,
      appId,
      cluster,
      pollingRetryPolicy
    }, this._options.enableUpdateNotification)

    polling.on('update', namespace => {
      log('client: receive update, start to fetch with no cache')

      // Always fetch non-cached configurations when received update event,
      // because we need to fetch the latest configs
      this._child(namespace).fetch(false)
    })
  }

  get cluster () {
    return this._options.cluster
  }

  _create (name, type, init) {
    const child = new this._Child({
      ...this._options,
      [this._key]: name
    }, type)

    init && init(child)

    return child
  }

  namespace (namespace, type = DEFAULT_NAMESPACE_TYPE) {
    checkNamespaceType(type)
    namespace = setDefault(namespace, this._options.namespace)

    return this._child(namespace, type, () => {
      // Start polling instantly,
      // even if the namespace is not ready
      this._polling.addNamespace(namespace, type)
    })
  }

  enableUpdateNotification (enable) {
    this._polling.enable(enable)

    return this
  }
}

module.exports = {
  ApolloCluster
}
