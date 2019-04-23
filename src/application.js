const {
  checkOptions,
  DEFAULT_CLUSTER
} = require('./options')
const {Base} = require('./util')

const {ApolloCluster} = require('./cluster')

module.exports = class ApolloApplication extends Base {
  constructor (options) {
    super(checkOptions(options),
      ApolloCluster, 'cluster', 'INVALID_CLUSTER_NAME')
  }

  cluster (cluster = DEFAULT_CLUSTER) {
    return this._child(cluster)
  }

  namespace (namespace, type) {
    return this.cluster().namespace(namespace, type)
  }
}
