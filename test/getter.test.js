const test = require('ava')
const {create} = require('./create')

test('default namespace', t => {
  t.is(create().namespace().namespace, 'application')
})

test('default cluster name', t => {
  t.is(create().cluster().cluster, 'default')
})

test('default cluster namespace name', t => {
  t.is(create().cluster().namespace().namespace, 'application')
})

test('namespace', t => {
  const app = create()
  const foo = app.cluster().namespace('foo')
  t.is(foo.namespace, 'foo')

  const foo2 = app.cluster().namespace('foo')
  t.is(foo2.namespace, 'foo')

  t.is(foo, foo2)
})

test('cluster', t => {
  const app = create()
  const foo = app.cluster('foo')
  t.is(foo.cluster, 'foo')

  const foo2 = app.cluster('foo')
  t.is(foo2.cluster, 'foo')

  t.is(foo, foo2)
})
