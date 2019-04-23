// Ref:
// https://github.com/ctripcorp/apollo/wiki/%E5%85%B6%E5%AE%83%E8%AF%AD%E8%A8%80%E5%AE%A2%E6%88%B7%E7%AB%AF%E6%8E%A5%E5%85%A5%E6%8C%87%E5%8D%97#14-%E5%BA%94%E7%94%A8%E6%84%9F%E7%9F%A5%E9%85%8D%E7%BD%AE%E6%9B%B4%E6%96%B0

const EventEmitter = require('events')
const log = require('util').debuglog('ctrip-apollo')
const request = require('request')

const {queryUpdate} = require('./url')
const {DEFAULT_NAMESPACE_TYPE} = require('./options')
const {error} = require('./error')

// TIMEOUT SHOULD LONGER THAN 60s
const POLLING_TIMEOUT = 70 * 1000

// All namespaces of the same cluster use a single Polling
class Polling extends EventEmitter {
  constructor (options, enabled) {
    super()

    this._options = options
    this._ns = new Set()
    this._nsTypes = Object.create(null)
    this._notificationIds = Object.create(null)
    this._abandoned = false
    this._started = false

    this.enable(enabled)
  }

  enable (enable) {
    this._enabled = enable

    if (enable) {
      this._check()
    }
  }

  _check () {
    if (
      this._enabled
      && this._ns.size > 0
      && !this._abandoned
      && !this._started
    ) {
      this.start()
    }
  }

  addNamespace (namespace, type) {
    this._ns.add(namespace)
    this._nsTypes[namespace] = type

    this._check()
  }

  _getNotifications () {
    const notifications = []

    for (const namespace of this._ns.values()) {
      const item = {
        namespaceName: this._nsTypes[namespace] === DEFAULT_NAMESPACE_TYPE
          ? namespace
          : `${namespace}.json`,
        notificationId: (namespace in this._notificationIds)
          ? this._notificationIds[namespace]
          : 0
      }

      notifications.push(item)
    }

    return notifications
  }

  start () {
    this._start(0)
  }

  _start (retries) {
    /* istanbul ignore if */
    if (!this._enabled) {
      // Stop polling when it is disabled
      this._started = false
      return
    }

    this._started = true

    const url = queryUpdate({
      ...this._options,
      notifications: this._getNotifications()
    })

    log('polling: request %s', decodeURIComponent(url))
    const start = Date.now()

    request(url, {
      timeout: POLLING_TIMEOUT
    }, (err, response) => {
      // Do nothing is polling is disabled
      if (!this._enabled) {
        this._started = false
        return
      }

      log('polling: responses cost: %s ms', Date.now() - start)

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
        this._start(0)
        return
      }

      if (status !== 200) {
        log('polling: response error, status: %s, body: %s', status, body)
        return this._handleError(
          error('POLLING_STATUS_ERROR', status),
          retries
        )
      }

      try {
        this._diff(JSON.parse(body))
      } catch (parseError) {
        this._handleError(
          error('POLLING_JSON_PARSE_ERROR', parseError),
          retries
        )
      }
    })
  }

  _handleError (err, retries) {
    log('polling: error, code: %s, stack: %s', err.code, err.stack)

    const {
      delay = 0,
      reset,
      abandon
    } = this._options.pollingRetryPolicy(retries)

    if (abandon) {
      this._abandoned = true

      // Mark as stopped when abandon
      this._started = false
      this.emit('abandon')
      return
    }

    const nextRetries = reset
      ? 0
      : retries + 1

    log('polling: retry %s in %s ms', nextRetries, delay)
    setTimeout(() => {
      this._start(nextRetries)
    }, delay)
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

        // Do not emit update for the first time
        return
      }

      // Actually, it will never happen
      // which is handled by apollo config service
      // but we still do this for fault tolerance

      /* istanbul ignore next */
      if (oldNotificationId === notificationId) {
        /* istanbul ignore next */
        return
      }

      this._notificationIds[namespaceName] = notificationId
      this.emit('update', namespaceName)
    })

    log('polling: emit update, start polling again')
    this.start(0)
  }
}

module.exports = {
  Polling
}
