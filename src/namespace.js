const path = require('path')
const EventEmitter = require('events')
const log = require('util').debuglog('ctrip-apollo')

const req = require('request')
const fs = require('fs-extra')

const {createKey} = require('./util')
const {error, composeError} = require('./error')
const {queryConfigAsJson, queryConfig} = require('./url')

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

const NOOP = () => {}

class ApolloNamespace extends EventEmitter {
  constructor (options) {
    super()

    this._options = options
    this._config = null
    this._releaseKey = null
    this._cacheFile = this._createCacheFile()

    this._fetchTimer = null
    this._ready = false
  }

  get namespace () {
    return this._options.namespace
  }

  get cluster () {
    return this._options.cluster
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

      this.emit('saved')
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

  async fetch (withCache) {
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

  async ready () {
    this._options.skipInitFetchIfCacheFound
      ? await this._readOrFetch()
      : await this._fetchOrFallback()

    if (this._options.enableFetch) {
      this.enableFetch(true)
    }

    this._checkReady = NOOP
    this._ready = true

    this.emit('ready')

    return this
  }

  async _readCache () {
    const cacheFile = this._cacheFile

    if (!cacheFile) {
      return null
    }

    try {
      await fs.access(cacheFile, fs.constants.R_OK)
    } catch (err) {
      throw error('NO_LOCAL_CACHE_FOUND', err, cacheFile)
    }

    try {
      return await fs.readJson(cacheFile)
    } catch (err) {
      throw error('READ_LOCAL_CACHE_FAILS', err, cacheFile)
    }
  }

  async _firstFetch () {
    const {
      config
    } = await this._loadWithNoCache()

    this._config = config
    this._save()
  }

  async _readOrFetch () {
    let readError

    try {
      this._config = await this._readCache()
    } catch (err) {
      readError = err
    }

    if (this._config) {
      log('cache found, skip fetching')
      return
    }

    try {
      await this._firstFetch()
      return
    } catch (err) {
      throw composeError(
        readError || error('NO_CACHE_SPECIFIED'),
        err
      )
    }
  }

  async _fetchOrFallback () {
    let fetchError

    try {
      await this._firstFetch()
      return
    } catch (err) {
      this.emit('fetch-error', err)
      fetchError = err
    }

    // If fails to fetch configurations from apollo,
    // then fallback to local cache file

    try {
      this._config = await this._readCache()
    } catch (err) {
      throw composeError(fetchError, err)
    }

    if (!this._config) {
      throw composeError(
        fetchError,
        error('NO_CACHE_SPECIFIED')
      )
    }
  }

  _checkReady (name) {
    throw error('NOT_READY', name)
  }

  config () {
    this._checkReady('config')
    return {
      ...this._config
    }
  }

  get (key) {
    this._checkReady('get')
    return this._config[key]
  }

  enableFetch (enable) {
    enable
      ? this._enableFetch()
      : this._disableFetch()

    return this
  }

  _enableFetch () {
    const options = this._options
    options.enableFetch = true

    if (!this._ready) {
      return
    }

    this._fetchTimer = setInterval(() => {
      if (!options.enableFetch) {
        return
      }

      this.fetch(options.fetchCachedConfig)
    }, options.fetchInterval)
  }

  _disableFetch () {
    this._options.enableFetch = false
    if (this._fetchTimer) {
      clearInterval(this._fetchTimer)
    }
  }
}

module.exports = {
  ApolloNamespace
}
