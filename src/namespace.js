const path = require('path')
const EventEmitter = require('events')
const log = require('util').debuglog('ctrip-apollo')

const req = require('request')
const fs = require('fs-extra')
const {diff} = require('diff-sorted-array')

const {createKey} = require('./util')
const {error, composeError} = require('./error')
const {queryConfigAsJson, queryConfig} = require('./url')

const request = (url, timeout) => new Promise((resolve, reject) => {
  let timedout = false

  let timer = timeout
    ? setTimeout(() => {
      timedout = true
      reject(error('FETCH_TIMEOUT', timeout))
    }, timeout)
    : null

  req(url, (err, response) => {
    if (timedout) {
      return
    }

    if (timeout) {
      clearTimeout(timer)
      timer = null
    }

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
  constructor (options, type) {
    super()

    this._options = options
    this._type = type

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
    } = await request(url, this._options.fetchTimeout)

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

  _save (config) {
    const cacheFile = this._cacheFile
    if (!cacheFile) {
      return
    }

    // Save asynchronously
    fs.outputJson(cacheFile, config, err => {
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

    const oldKeys = Object.keys(this._config)
    const newKeys = Object.keys(config)
    const {
      unchanged,
      added,
      deleted
    } = diff(oldKeys, newKeys)

    if (this._options.entireRes) {
      this.emit('change', {
        oldValue: this._config,
        newValue: config,
      })
    } else {
      unchanged.forEach(key => {
        const oldValue = this._config[key]
        const newValue = config[key]

        if (oldValue === newValue) {
          return
        }

        this._config[key] = newValue

        this.emit('change', {
          oldValue,
          newValue,
          key
        })
      })
    }

    added.forEach(key => {
      const value = config[key]

      this._config[key] = value

      this.emit('add', {
        value,
        key
      })
    })

    deleted.forEach(key => {
      const value = this._config[key]

      delete this._config[key]

      this.emit('delete', {
        value,
        key
      })
    })

    this.emit('updated')
    this._save(this._config)
  }

  async fetch (withCache) {
    if (!this._ready) {
      return
    }

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
    const config = this._options.skipInitFetchIfCacheFound
      ? await this._readOrFetch()
      : await this._fetchOrFallback()

    this._config = config

    this._checkReady = NOOP
    this._ready = true

    if (this._options.enableFetch) {
      this.enableFetch(true)
    }

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

    this._save(config)

    return config
  }

  async _readOrFetch () {
    let readError
    let config

    try {
      config = await this._readCache()
    } catch (err) {
      readError = err
    }

    if (config) {
      log('cache found, skip fetching')
      return config
    }

    try {
      return await this._firstFetch()
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
      return await this._firstFetch()
    } catch (err) {
      this.emit('fetch-error', err)
      fetchError = err
    }

    // If fails to fetch configurations from apollo,
    // then fallback to local cache file
    let config

    try {
      config = await this._readCache()
    } catch (err) {
      throw composeError(fetchError, err)
    }

    if (config) {
      return config
    }

    throw composeError(
      fetchError,
      error('NO_CACHE_SPECIFIED')
    )
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

  has (key) {
    this._checkReady('has')
    return key in this._config
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
      // if (!options.enableFetch) {  // <- never happen
      //   return
      // }

      this.fetch(options.fetchCachedConfig)
    }, options.fetchInterval)
  }

  _disableFetch () {
    this._options.enableFetch = false

    if (this._fetchTimer) {
      clearInterval(this._fetchTimer)
      this._fetchTimer = null
    }
  }
}

module.exports = {
  ApolloNamespace
}
