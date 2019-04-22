const {
  ConfigService,
  superAdmin
} = require('apollo-mock-server')

const prepare = async pollingTimeout => {
  const config = new ConfigService({
    pollingTimeout
  })

  const port = await config.listen()
  return `http://127.0.0.1:${port}`
}

const listen = async (pollingTimeout, port) => {
  const config = new ConfigService({
    pollingTimeout
  })

  return config.listen(port)
}

module.exports = {
  listen,
  prepare,
  superAdmin
}
