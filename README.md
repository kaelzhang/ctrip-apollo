[![Build Status](https://travis-ci.org/kaelzhang/ctrip-apollo.svg?branch=master)](https://travis-ci.org/kaelzhang/ctrip-apollo)
[![Coverage](https://codecov.io/gh/kaelzhang/ctrip-apollo/branch/master/graph/badge.svg)](https://codecov.io/gh/kaelzhang/ctrip-apollo)
<!-- optional appveyor tst
[![Windows Build Status](https://ci.appveyor.com/api/projects/status/github/kaelzhang/ctrip-apollo?branch=master&svg=true)](https://ci.appveyor.com/project/kaelzhang/ctrip-apollo)
-->
<!-- optional npm version
[![NPM version](https://badge.fury.io/js/ctrip-apollo.svg)](http://badge.fury.io/js/ctrip-apollo)
-->
<!-- optional npm downloads
[![npm module downloads per month](http://img.shields.io/npm/dm/ctrip-apollo.svg)](https://www.npmjs.org/package/ctrip-apollo)
-->
<!-- optional dependency status
[![Dependency Status](https://david-dm.org/kaelzhang/ctrip-apollo.svg)](https://david-dm.org/kaelzhang/ctrip-apollo)
-->

# ctrip-apollo

The most delightful and handy Node.js client for ctrip [apollo](https://github.com/ctripcorp/apollo) configuration service.

## Install

```sh
$ npm i ctrip-apollo
```

## Usage

```js
const apollo = require('ctrip-apollo')

const client = apollo({
  host: 'http://localhost:8070',
  appId: '100004458'
})

await client.ready()

console.log(client.get('portal.elastic.cluster.name'))
```

## apollo(options)

- **options** `Object`
  - **host** `URL::host` the host (including protocol, hostname and port) of the apollo config service
  - **appId** `string` apollo application id
  - **cluster?** `string='default'` cluster name
  - **namespace?** `string='application'` namespace name. Defaults to `'application'`
  - **fetchInterval?** `number=5 * 60 * 1000` interval in milliseconds to pull the new configurations. Set this option to `0` to disable the feature. Defaults to `5` minutes
  - **fetchCachedConfig?** `boolean=true` whether refresh configurations by fetching the restful API with caches. Defaults to `true`. If you want to always fetch the latest configurations (not recommend), set the option to `false`
  - **updateNotification?** `boolean=true` set to `true` to enable update notification by using HTTP long polling.
  - **cachePath?** `path` specify this option to enable the feature to save configurations to the disk

Returns `ApolloClient` and class `ApolloClient` is a subclass of [`EventEmitter`](https://nodejs.org/dist/latest-v11.x/docs/api/events.html#events_class_eventemitter)

### options.updateNotification

If `options.updateNotification` is enabled, `options.fetchInterval` will be disabled unless polling is [abandoned](https://github.com/kaelzhang/ctrip-apollo#apollopollingretrypolicy-functionretries-pollingretrypolicy).

### await client.ready()

Fetch the configuration from config service for the first time or fallback to local cache file.

**MAKE SURE** we await `client.ready()` before any `client.config()` or `client.get()` methods are invoked.

### client.config()

Returns `Object` all configurations for the current namespace / application

```js
console.log('application config', client.config())
```

### client.get(key)

- **key** `string` config key name

Returns the config value of the corresponding key `key`

```js
console.log('config for host', client.get('host'))
```

### client.namespace(namespace)

- **namespace** `string` namespace name

Creates and returns a new `ApolloClient` with `namespace`. If the given `namespace` is equivalent to the namespace of `client`, `this` object will be returned.

```js
const ns = client.namespace('web')
```

### Event: `'change'`

Emits if the any configuration changes.

By default, `ctrip-apollo` uses HTTP long polling to listen the changes of the configurations.

```js
client.on('change', e => {
  console.log('key', e.key)
  console.log('oldValue', e.oldValue)
  console.log('newValue', e.newValue)
})
```

If `options.fetchInterval` is set to `0` and `options.updateNotification` is set to `false`, then the event will never emit.

### Event: `'fetch-error'`

Emits if it fails to fetch configurations

### Event: `'save-error'`

Emits if it fails to save configurations to local cache file

## apollo.pollingRetryPolicy `Function(retries): PollingRetryPolicy`

`apollo.pollingRetryPolicy` is a setter to change the global policy to tell the system what to do next if an error occured when polling update notifications.

`apollo.pollingRetryPolicy` accepts a `Function(retries)` which returns an interface of `PollingRetryPolicy`

- **retries** `number` how many times has retried till the last error.

```ts
interface PollingRetryPolicy {
  // `abandon: true` ignores all properties below
  // and stops update notification polling which is a dangerous directive
  // After that,
  // `ctrip-apollo` will fallback to fetching configurations
  // every `fetchInterval` milliseconds
  abandon?: boolean
  // After `delay` milliseconds,
  // it will try to poll the update notification again
  delay?: number
  // Tells the system to reset the `retries` counter.
  // And the `retries` counter always reset to zero if it receives a sucessful notification
  reset?: boolean
}

// If there is no properties set, it will retry immediately.
```

The default `apollo.pollingRetryPolicy` is equivalent to:

```js
apollo.pollingRetryPolicy = apollo.DEFAULT_POLLING_RETRY_POLICY
```

And we can define our own policy

```js
apollo.pollingRetryPolicy = retries => ({
  // Stop polling after 11(the first and the latter 10 retries) errors
  abandon: retries >= 10,
  delay: retries * 10 * 1000
})
```

## License

[MIT](LICENSE)
