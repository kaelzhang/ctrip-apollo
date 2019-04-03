const path = require('path')
const {isObject, isString, isNumber, isBoolean} = require('core-util-is')
const {error} = require('./error')

const DEFAULT_CLUSTER = 'default'
const DEFAULT_NAMESPACE = 'application'
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000

const RULES = {
  host: {
    validate: isString,
  },
  appId: {
    validate: isString
  },
  cluster: {
    validate: isString
  },
  namespace: {
    validate: isString
  },
  ip: {
    validate: isString,
    optional: true
  },
  dataCenter: {
    validate: isString,
    optional: true
  },
  refreshInterval: {
    validate: isNumber
  },
  longPolling: {
    validate: isBoolean
  },
  fetchCachedConfig: {
    validate: isBoolean
  },
  cachePath: {
    validate: isString,
    optional: true,
    set: path.resolve
  }
}

const KEYS = Object.keys(RULES)

const ensureType = object => {
  KEYS.forEach(key => {
    const {
      validate,
      optional,
      code,
      set
    } = RULES[key]

    const v = object[key]

    if (optional && v === undefined) {
      return
    }

    if (!validate(v)) {
      throw error(`INVALID_${key.toUpperCase()}`, v)
    }

    if (set) {
      object[key] = set(v)
    }
  })

  return object
}

module.exports = options => {
  if (!isObject(options)) {
    throw error('INVALID_OPTIONS', options)
  }

  const {
    host,
    appId,
    cluster = DEFAULT_CLUSTER,
    namespace = DEFAULT_NAMESPACE,
    ip,
    dataCenter,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    longPolling = true,
    cachePath
  } = options

  return ensureType({
    host,
    appId,
    cluster,
    namespace,
    ip,
    dataCenter,
    refreshInterval,
    longPolling,
    cachePath
  })
}
