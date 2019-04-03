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

The most delightful and handy Node.js client for ctrip [apollo](https://github.com/ctripcorp/apollo)

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
```

## apollo(options)

- **options** `Object`
  - **host** `URL::host` the host (including protocol, hostname and port) of the apollo config service
  - **appId** `string` apollo application id
  - **cluster?** `string='default'` cluster name
  - **namespace?** `string='application'` namespace name. Defaults to `'application'`
  - **refreshInterval?** `number=5 * 60 * 1000` interval in milliseconds to pull the new configurations. Set this option to `0` to disable the feature. Defaults to `5` minutes
  - **fetchCachedConfig** `boolean=true` whether refresh configurations by fetching the restful API with caches. Defaults to `true`. If you want to always fetch the latest configurations (not recommend), set the option to `false`
  - **updateNotification?** `boolean=false` set to `true` to enable update notification by using HTTP long polling.
  - **cachePath?** `path` specify this option to enable the feature to save configurations to the disk

Returns `ApolloClient` and class `ApolloClient` is a subclass of [`EventEmitter`](https://nodejs.org/dist/latest-v11.x/docs/api/events.html#events_class_eventemitter)

### options.updateNotification

If `options.updateNotification` is enabled, `options.refreshInterval` will be disabled unless

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

### Event: `change`

Emits if the any configuration changes. `ctrip-apollo` uses HTTP long polling to listen the changes of the configurations.

And the client will pull the new configurations every `5` miutes which can be changed by `options.refreshInterval`

```js
client.on('change', e => {
  console.log('key', e.key)
  console.log('oldValue', e.oldValue)
  console.log('newValue', e.newValue)
  console.log('type', e.type)
})
```

If `options.refreshInterval` is set to `0` and `options.longPolling` is set to `false`, then the event will never emit.

### Event: `fetch-error`

Emits if it fails to fetch configurations

### Event: 'save-error'

Emits if it fails to save configurations to local cache file

## License

MIT
