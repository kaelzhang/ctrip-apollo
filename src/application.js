const {isString} = require('core-util-is')

const {
  checkOptions,
  DEFAULT_CLUSTER,
  DEFAULT_NAMESPACE
} = require('./options')
const {error} = require('./error')

const {ApolloCluster} = require('./cluster')

module.exports = class ApolloApplication {
  constructor (options) {
    this._options = checkOptions(options)
    this._clusters = Object.create(null)
  }

  cluster (cluster = DEFAULT_CLUSTER) {
    if (!isString(cluster)) {
      throw error('INVALID_CLUSTER', cluster)
    }

    if (cluster in this._clusters) {
      return this._clusters[cluster]
    }

    return this._clusters[cluster] = new ApolloCluster({
      ...this._options,
      cluster
    })
  }

  namespace (namespace = DEFAULT_NAMESPACE) {
    return this.cluster().namespace(namespace)
  }
}
