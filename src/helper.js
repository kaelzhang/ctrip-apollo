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
  releaseKey: r,
  // ip: optional
  ip: i,
  // dataCenter: optional
  dataCenter: d,
  // messages: optional
  // messages: m

}) => `${h}/configs/${a}/${c}/${n}${
  createQuery({
    releaseKey: r,
    ip: i,
    dataCenter: d,
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
  ip: i,
  // dataCenter: optional
  dataCenter: d
}) => `${h}/configfiles/json/${a}/${c}/${n}${
  createQuery({
    ip: i,
    dataCenter: d
  })
}`

module.exports = {
  queryConfigAsJson,
  queryConfig
}
