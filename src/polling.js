// Ref:
// https://github.com/ctripcorp/apollo/wiki/%E5%85%B6%E5%AE%83%E8%AF%AD%E8%A8%80%E5%AE%A2%E6%88%B7%E7%AB%AF%E6%8E%A5%E5%85%A5%E6%8C%87%E5%8D%97#14-%E5%BA%94%E7%94%A8%E6%84%9F%E7%9F%A5%E9%85%8D%E7%BD%AE%E6%9B%B4%E6%96%B0

const EventEmitter = require('events')
const log = require('util').debuglog('ctrip-apollo')
const request = require('request')

const {createKey} = require('./util')
const {queryUpdate} = require('./url')
const {error} = require('./error')

class Polling extends EventEmitter {
  constructor (options) {
    super()

    this._options = options
    this._ns = new Set()
    this._notificationIds = Object.create(null)
    this._abandoned = false
    this._started = false
  }

  addNamespace (namespace) {
    this._ns.add(namespace)

    if (
      this._ns.size > 0
      && !this._abandoned
      && !this._started
    ) {
      this.start()
    }
  }

  _getNotifications () {
    const notifications = []

    for (const namespace of this._ns.values()) {
      const item = {
        namespaceName: `${namespace}.json`
      }

      if (namespace in this._notificationIds) {
        ret.notificationId = this._notificationIds[namespace]
      }

      notifications.push(item)
    }

    return notifications
  }

  start (retries = 0) {
    this._started = true

    const url = queryUpdate({
      ...this._options,
      notifications: this._getNotifications()
    })

    request(url, (err, response) => {
      log('polling: responses')

      if (err) {
        return this._handleError(
          error('POLLING_ERROR', err),
          retries
        )
      }

      const {
        statusCode: status,
        body
      } = response

      // There is no changes
      if (status === 304) {
        log('polling: no changes, start polling again')
        this.start(0)
        return
      }

      if (status !== 200) {
        return this._handleError(
          error('POLLING_STATUS_ERROR', status),
          retries
        )
      }

      try {
        this._diff(JSON.parse(body))
      } catch (err) {
        this._handleError(
          error('POLLING_JSON_PARSE_ERROR', err),
          retries
        )
      }
    })
  }

  _handleError (err, retries) {
    log('polling: error, code: %s, stack: %s', err.code, err.stack)

    const {
      delay,
      reset,
      abandon
    } = PollingManager.pollingRetryPolicy(retries)

    if (abandon) {
      this._abandoned = true
      this.emit('abandon')
      return
    }

    setTimeout(() => {
      this.start(
        reset
          ? 0
          : retries + 1
      )
    })
  }

  _diff (notifications) {
    notifications.forEach(({
      namespaceName,
      notificationId
    }) => {
      const oldNotificationId = this._notificationIds[namespaceName]

      if (!oldNotificationId) {
        // Update the current notification id
        this._notificationIds[namespaceName] = notificationId
        return
      }

      if (oldNotificationId === notificationId) {
        return
      }

      this.emit('update', namespaceName)
    })

    log('polling: emit update, start polling again')
    this.start(0)
  }
}

const ATOM_RETRY_DELAY = 10 * 1000
const DEFAULT_POLLING_RETRY_POLICY = retries => {
  const ret = {
    delay: retries * ATOM_RETRY_DELAY,
    reset: false
  }

  // Longer than 60 is non-sense,
  // because the max response time of
  if (retries >= 6) {
    ret.reset = true
  }

  return ret
}

class PollingManager {
  constructor () {
    this._polling = Object.create(null)
  }

  register ({
    host,
    appId,
    cluster
  }) {
    const key = createKey(host, appId, cluster)
    const polling = this._polling[key]
    if (polling) {
      return polling
    }

    return this._polling[key] = new Polling({
      host,
      appId,
      cluster
    })
  }
}

PollingManager.pollingRetryPolicy = DEFAULT_POLLING_RETRY_POLICY

module.exports = {
  manager: new PollingManager(),
  PollingManager,
  DEFAULT_POLLING_RETRY_POLICY
}
