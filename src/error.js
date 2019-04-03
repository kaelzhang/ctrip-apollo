const {format} = require('util')
const {
  Errors,
  error: _error
} = require('err-object')
const {E, error} = new Errors()

const EE = (name, type, desc = name, unit = 'a') => E(
  `INVALID_${name.toUpperCase()}`,
  `${desc} must be ${unit} ${type}`,
  TypeError
)

EE('options', 'object', 'an')
EE('host', 'string', 'options.host')
EE('appId', 'string', 'options.appId')
EE('cluster', 'string', 'options.cluster')
EE('namespace', 'string', 'options.namespace')
EE('ip', 'string', 'options.ip')
EE('dataCenter', 'string', 'options.dataCenter')
EE('refreshInterval', 'number', 'options.refreshInterval')
EE('longPolling', 'boolean', 'options.longPolling')
EE('cachePath', 'string', 'options.cachePath')

const EEE = (code, message) => E('FETCH_REQUEST_ERROR', {
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

module.exports = {
  error
}
