const createKey = (...args) =>
  Buffer.from(args.join('|')).toString('base64')

module.exports = {
  createKey
}
