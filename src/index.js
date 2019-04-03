const EventEmitter = require('events')
const path = require('path')
const req = require('request')
const fs = require('fs-extra')

const checkOptions = require('./options')
const {error} = require('./error')
const {
  queryConfigAsJson,
  queryConfig
} = require('./helper')

const request = url => new Promise((resolve, reject) => {
  request(url, (err, response) => {
    if (err) {
      return reject(error('FETCH_REQUEST_ERROR', err))
    }

    const {body, status} = response

    if (status === 304) {
      return resolve({
        noChange: true
      })
    }

    const config = body
    resolve({
      config
    })
  })
})

class Apollo extends EventEmitter {
  constructor (options) {
    super()
    this._options = checkOptions(options)
    this._config = null
    this._releaseKey = null
    this._fetchCachedConfig = this._options.fetchCachedConfig
    this._cacheFile = this._createCacheFile()
  }

  _load () {
    const url = queryConfig({
      ...this._options,
      releaseKey: this._releaseKey
    })
    return request(url)
  }

  _loadWithCache () {
    const url = queryConfigAsJson(this._options)
    return request(url)
  }

  async _fetch () {
    let result
    try {
      result = await this._fetchCachedConfig
        ? this._loadWithCache()
        : this._load()
    } catch (error) {
      this.emit('fetch-error', error)
      return
    }

    this._diffAndSave(result)
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
        key,
        // TODO
        type
      })
    })

    // Directly set the new value,
    // so that we need not to deal with deleted keys
    this._config = config

    const cacheFile = this._cacheFile
    if (!cacheFile) {
      return
    }

    // Save asynchronously
    fs.outputJson(cacheFile, config, err => {
      this.emit('save-error', err)
    })
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

    const filename = [
      host,
      appId,
      cluster,
      namespace
    ].join(':')

    const encoded = Buffer.from(filename).toString('base64')

    return path.join(cachePath, encoded)
  }

  async ready () {
    let config
    let fetchError

    try {
      ({
        config: this._config
      } = await this._load())
      return
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
    } catch (error) {
      throw error('READ_LOCAL_CACHE_FAILS', err, cacheFile)
    }
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

    return new Apollo(options)
  }
}

const apollo = options => new Apollo()

apollo.Apollo = Apollo

module.exports = apollo
