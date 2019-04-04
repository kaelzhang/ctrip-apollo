const {format} = require('util')
const {
  Errors,
  error: _error
} = require('err-object')
const {E, error} = new Errors()

const EE = (name, type, desc = name, unit = 'a') => E(
  `INVALID_${name.toUpperCase()}`,
  `${desc} must be ${unit} ${type}, but got %s`,
  TypeError
)

E('FETCH_STATUS_ERROR', 'config service got response status %s')

E('POLLING_STATUS_ERROR', 'polling response status %s')

EE('options', 'object', 'options', 'an')
EE('host', 'string', 'options.host')
EE('appId', 'string', 'options.appId')
EE('cluster', 'string', 'options.cluster')
EE('namespace', 'string', 'options.namespace')
EE('ip', 'string', 'options.ip')
EE('dataCenter', 'string', 'options.dataCenter')
EE('refreshInterval', 'number', 'options.refreshInterval')
EE('updateNotification', 'boolean', 'options.updateNotification')
EE('cachePath', 'string', 'options.cachePath')

const EEE = (code, message) => E(code, {
  message
}, ({
  code,
  preset,
  args: [err, ...args]
}) => {
  err.message = format(`${preset.message}: ${err.message}`, ...args)
  err.code = code
  return err
})

EEE('FETCH_REQUEST_ERROR', 'fails to get config')

const INITIAL_FETCH_FAILS = 'initial fetch fails'
EEE('INIT_FETCH_FAILS',
  `${INITIAL_FETCH_FAILS}, and options.cachePath not specified`)

EEE('NO_LOCAL_CACHE_FOUND', `${
  INITIAL_FETCH_FAILS
}, and local cache file "%s" not found or not accessible`)

EEE('READ_LOCAL_CACHE_FAILS',
  `${INITIAL_FETCH_FAILS}, and fails to read local cache file "%s"`)

EEE('JSON_PARSE_ERROR', 'fails to parse JSON')

EEE('POLLING_ERROR', 'polling request fails')

EEE('POLLING_JSON_PARSE_ERROR', 'polling result fails to parse')

module.exports = {
  error
}
