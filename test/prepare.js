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

module.exports = {
  prepare,
  superAdmin
}
