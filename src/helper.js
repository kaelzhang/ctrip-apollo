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

const DEFAULT_NAMESPACE = 'application'

const queryConfig = (
  // host
  h,
  // appId
  a,
  // cluster
  c,
  // namespace
  n = DEFAULT_NAMESPACE,
  // releaseKey: optional
  r,
  // ip: optional
  i,
  // dataCenter: optional
  d,
  // messages: optional
  m

) => `${h}/configs/${a}/${c}/${n}${
  createQuery({
    releaseKey: r,
    ip: i,
    dataCenter: d,
    messages: m
  })
}`

const queryConfigAsJson = (
  h,
  a,
  c,
  n = DEFAULT_NAMESPACE,
  // ip: optional
  i,
  // dataCenter: optional
  d
) => `${h}/configfiles/json/${a}/${c}/${n}${
  createQuery({
    ip: i,
    dataCenter: d
  })
}`

module.exports = {
  queryConfigAsJson,
  queryConfig
}
