const {stringify} = require('querystring')

const makeNamespaceArray = n => Array.isArray(n)
  ? n.length === 0
    ? ['application']
    : n
  : [n]

const isPlainObject = o => Object.keys(o).length === 0

const createQuery = options => {
  const query = Object.keys(options).reduce((ret, key) => {
    const v = options[key]
    if (v !== undefined && v !== null) {
      ret[key] = v
    }

    return ret
  }, {})

  if (isPlainObject(query)) {
    return ''
  }

  return `?${stringify(query)}`
}

// Ref
// https://github.com/ctripcorp/apollo/wiki/其它语言客户端接入指南

// API url without cache
const queryConfig = ({
  // host
  host: h,
  // appId
  appId: a,
  // cluster
  cluster: c,
  // namespace
  namespace: n,
  // releaseKey: optional
  releaseKey,
  // ip: optional
  ip,
  // dataCenter: optional
  dataCenter,
  // messages: optional
  // messages: m

}) => `${h}/configs/${a}/${c}/${n}${
  createQuery({
    releaseKey,
    ip,
    dataCenter,
    // messages: m
  })
}`

// API url with cache
const queryConfigAsJson = ({
  host: h,
  appId: a,
  cluster: c,
  namespace: n,
  // ip: optional
  ip,
  // dataCenter: optional
  dataCenter
}) => `${h}/configfiles/json/${a}/${c}/${n}${
  createQuery({
    ip,
    dataCenter
  })
}`

const queryUpdate = ({
  host,
  appId,
  cluster,
  notifications: n
}) => `${host}/notifications/v2${
  createQuery({
    appId,
    cluster,
    notifications: JSON.stringify(n)
  })
}`

module.exports = {
  queryConfigAsJson,
  queryConfig,
  queryUpdate
}
