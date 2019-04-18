const {format} = require('util')
const {Errors} = require('err-object')

const {E, error} = new Errors({
  prefix: '[ctrip-apollo] '
})

const EE = (name, type, desc = name, unit = 'a') => E(
  `INVALID_${name.toUpperCase()}`,
  `${desc} must be ${unit} ${type}, but got %s`,
  TypeError
)

E('NOT_READY', 'never call %s() before ready')

E('FETCH_STATUS_ERROR', 'config service got response status %s')

E('POLLING_STATUS_ERROR', 'polling response status %s')

// Type checking
///////////////////////////////////////////////////////////////////////
EE('options', 'object', 'options', 'an')
EE('host', 'string', 'options.host')
EE('appId', 'string', 'options.appId')
EE('cluster', 'string', 'options.cluster')
EE('namespace', 'string', 'options.namespace')
EE('ip', 'string', 'options.ip')
EE('dataCenter', 'string', 'options.dataCenter')
EE('fetchInterval', 'number', 'options.refreshInterval')
EE('enableUpdateNotification', 'boolean', 'options.enableUpdateNotification')
EE('pollingRetryPolicy', 'function', 'options.pollingRetryPolicy')
EE('enableFetch', 'boolean', 'options.enableFetch')
EE('cachePath', 'string', 'options.cachePath')

EE('CLUSTER_NAME', 'string', 'cluster')
EE('NAMESPACE_NAME', 'string', 'namespace')

// Wrap other errors
////////////////////////////////////////////////////////////////////////
const EEE = (code, message) => E(code, {
  message
}, ({
  preset,
  args: [err, ...args]
}) => {
  err.originalMessage = format(preset.message, ...args)
  err.message = `${err.originalMessage}: ${err.message}`
  err.reason = err.message
  err.code = code
  return err
})

EEE('FETCH_REQUEST_ERROR', 'fails to get config')

EEE('JSON_PARSE_ERROR', 'fails to parse JSON')

EEE('POLLING_ERROR', 'polling request fails')

EEE('POLLING_JSON_PARSE_ERROR', 'polling result fails to parse')

// Read cache
///////////////////////////////////////////////////////////////////////
EEE('NO_LOCAL_CACHE_FOUND', 'local cache file "%s" not found or not accessible')

EEE('READ_LOCAL_CACHE_FAILS', 'fails to read local cache file "%s"')

// ready
///////////////////////////////////////////////////////////////////////
EEE('INIT_FETCH_FAILS',
  'initial fetch fails, and options.cachePath not specified')

const composeError = (primary, secondary) => {
  primary.message = `${
    primary.originalMessage || primary.message
  }, and ${
    secondary.originalMessage || secondary.message}`

  if (primary.reason && secondary.reason) {
    primary.message += ', reason:'
  }

  if (primary.reason) {
    primary.message += `\n- ${primary.reason}`
  }

  if (secondary.reason) {
    primary.message += `\n- ${secondary.reason}`
  }

  return primary
}

module.exports = {
  error,
  composeError
}
