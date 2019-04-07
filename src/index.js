const EventEmitter = require('events')
const path = require('path')
const log = require('util').debuglog('ctrip-apollo')
const req = require('request')
const fs = require('fs-extra')

const {
  checkOptions,
  AVAILABLE_OPTIONS
} = require('./options')
const {createKey} = require('./util')
const {error} = require('./error')
const {
  queryConfigAsJson,
  queryConfig
} = require('./url')
const {
  DEFAULT_POLLING_RETRY_POLICY,
  manager,
  PollingManager
} = require('./polling')

const request = url => new Promise((resolve, reject) => {
  req(url, (err, response) => {
    if (err) {
      return reject(error('FETCH_REQUEST_ERROR', err))
    }

    const {
      body,
      statusCode: status
    } = response

    if (status === 304) {
      return resolve({
        noChange: true
      })
    }

    if (status !== 200) {
      return reject(error('FETCH_STATUS_ERROR', status))
    }

    try {
      resolve({
        config: JSON.parse(body)
      })
    } catch (parseError) {
      reject(error('JSON_PARSE_ERROR', parseError))
    }
  })
})

const CONVERTER = {
  CACHE: json => json,
  NO_CACHE: json => json.configurations
}

class ApolloClient extends EventEmitter {
  constructor (options) {
    super()
    this._options = checkOptions(options)
    this._config = null
    this._releaseKey = null
    this._fetchCachedConfig = this._options.fetchCachedConfig
    this._cacheFile = this._createCacheFile()

    this._polling = null

    this._options.updateNotification
      ? this._initNotification()
      : this._initFetch()
  }

  _createCacheFile () {
    const {
      cachePath
    } = this._options

    if (!cachePath) {
      return false
    }

    const {
      host,
      appId,
      cluster,
      namespace,
    } = this._options

    const filename = createKey(
      host,
      appId,
      cluster,
      namespace
    )

    return path.join(cachePath, filename)
  }

  _initNotification () {
    const polling = manager.register(this._options)
    this._polling = polling

    polling.on('update', namespace => {
      if (namespace !== this._options.namespace) {
        return
      }

      log('client: receive update, start to fetch with no cache')

      // Always fetch non-cached configurations when received update event,
      // because we need to fetch the latest configs
      this._fetch(false)
    })

    polling.on('abandon', () => {
      // If abandoned, downgrade to fetch
      this._initFetch()
    })
  }

  async _load (url, converter) {
    const {
      noChange,
      config
    } = await request(url)

    if (noChange) {
      return {
        noChange
      }
    }

    const {
      releaseKey
    } = config

    if (releaseKey) {
      this._releaseKey = releaseKey
    }

    return {
      config: converter(config)
    }
  }

  _loadWithNoCache () {
    const url = queryConfig({
      ...this._options,
      releaseKey: this._releaseKey
    })

    log('client: load with no cache: %s', url)
    return this._load(url, CONVERTER.NO_CACHE)
  }

  _loadWithCache () {
    const url = queryConfigAsJson(this._options)

    log('client: load with cache: %s', url)
    return this._load(url, CONVERTER.CACHE)
  }

  _save () {
    const cacheFile = this._cacheFile
    if (!cacheFile) {
      return
    }

    // Save asynchronously
    fs.outputJson(cacheFile, this._config, err => {
      if (err) {
        log('client: save error, stack: %s', err.stack)
        this.emit('save-error', err)
        return
      }

      log('client: save success')
    })
  }

  _diffAndSave ({
    noChange,
    config
  }) {
    if (noChange) {
      return
    }

    Object.keys(config).forEach(key => {
      const oldValue = this._config[key]
      const newValue = config[key]

      if (oldValue === newValue) {
        return
      }

      this.emit('change', {
        oldValue,
        newValue,
        key
      })
    })

    // Directly set the new value,
    // so that we need not to handle with deleted keys
    this._config = config
    this._save()
  }

  async _fetch (withCache) {
    let result
    try {
      result = withCache
        ? await this._loadWithCache()
        : await this._loadWithNoCache()
    } catch (err) {
      this.emit('fetch-error', err)
      return
    }

    log('client: start diff: %j', result)
    this._diffAndSave(result)
  }

  _initDone (save) {
    this._polling.addNamespace(this._options.namespace)

    if (save) {
      this._save()
    }
  }

  async ready () {
    let fetchError

    try {
      ({
        config: this._config
      } = await this._loadWithNoCache())
      return this._initDone(true)
    } catch (err) {
      this.emit('fetch-error', err)
      fetchError = err
    }

    const cacheFile = this._cacheFile

    // If fails to fetch configurations from apollo,
    // then fallback to local cache file

    if (!cacheFile) {
      throw error('INIT_FETCH_FAILS', fetchError)
    }

    try {
      await fs.access(cacheFile, fs.constants.R_OK)
    } catch (err) {
      throw error('NO_LOCAL_CACHE_FOUND', err, cacheFile)
    }

    try {
      this._config = await fs.readJson(cacheFile)
    } catch (err) {
      throw error('READ_LOCAL_CACHE_FAILS', err, cacheFile)
    }

    this._initDone()
  }

  config () {
    return {
      ...this._config
    }
  }

  get (key) {
    return this._config[key]
  }

  namespace (namespace) {
    if (namespace === this._options.namespace) {
      return this
    }

    const options = {
      ...this._options,
      namespace
    }

    return new ApolloClient(options)
  }
}

const apollo = options => new ApolloClient(options)

apollo.ApolloClient = ApolloClient

Object.defineProperties(apollo, {
  pollingRetryPolicy: {
    set (policy) {
      PollingManager.policy = policy
    }
  },

  DEFAULT_POLLING_RETRY_POLICY: {
    value: DEFAULT_POLLING_RETRY_POLICY
  },

  AVAILABLE_OPTIONS: {
    value: AVAILABLE_OPTIONS
  }
})

module.exports = apollo
