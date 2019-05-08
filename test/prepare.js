const {
  ConfigService,
  superAdmin
} = require('apollo-mock-server')

const prepare = async (pollingTimeout, configDelay = 0) => {
  const config = new ConfigService({
    pollingTimeout,
    configDelay
  })

  const port = await config.listen()
  return {
    host: `http://127.0.0.1:${port}`,
    config
  }
}

const listen = async (pollingTimeout, port) => {
  const config = new ConfigService({
    pollingTimeout
  })

  return {
    host: await config.listen(port),
    config
  }
}

module.exports = {
  listen,
  prepare,
  superAdmin
}
