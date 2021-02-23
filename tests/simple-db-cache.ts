import test from 'tape'
import path from 'path'
import { promises as fs } from 'fs'
import { SimpleDbCache } from '../src/simple-db-cache'

const fixtures = path.join(__dirname, 'fixtures')
const aAAfoo = path.join(fixtures, 'a', 'aa', 'foo.ts')
const aAAbar = path.join(fixtures, 'a', 'aa', 'bar.ts')
const aABfoo = path.join(fixtures, 'a', 'ab', 'foo.ts')

async function touch(fullPath: string) {
  const content = await fs.readFile(fullPath, 'utf8')
  return fs.writeFile(fullPath, content, 'utf8')
}

async function addUpperCase(
  dirtSimpleFileCache: SimpleDbCache,
  fullPath: string
) {
  const content = await fs.readFile(fullPath, 'utf8')
  const upperCase = content.toUpperCase()
  dirtSimpleFileCache.add(fullPath, upperCase)
}

async function run(t: test.Test, simpleDbCache: SimpleDbCache) {
  //
  t.comment('Empty cache')
  simpleDbCache.clearSync()

  t.notOk(simpleDbCache.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.notOk(simpleDbCache.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.notOk(simpleDbCache.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')

  //
  t.comment('Adding /a/aa/foo.ts to cache')
  await addUpperCase(simpleDbCache, aAAfoo)

  t.equal(
    simpleDbCache.get(aAAfoo),
    '// A/AA/FOO.TS\n',
    'getting /a/aa/foo.ts returns converted'
  )
  t.notOk(simpleDbCache.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.notOk(simpleDbCache.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')

  //
  t.comment('Clear cache')

  simpleDbCache.clearSync()
  t.notOk(simpleDbCache.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.notOk(simpleDbCache.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.notOk(simpleDbCache.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')

  //
  t.comment('Adding /a/ab/foo.ts to cache')

  await addUpperCase(simpleDbCache, aABfoo)
  t.notOk(simpleDbCache.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.notOk(simpleDbCache.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.equal(
    simpleDbCache.get(aABfoo),
    '// A/AB/FOO.TS\n',
    'getting /a/ab/foo.ts returns converted'
  )

  //
  t.comment('Adding /a/aa/bar.ts to cache')

  await addUpperCase(simpleDbCache, aAAbar)
  t.notOk(simpleDbCache.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.equal(
    simpleDbCache.get(aAAbar),
    '// A/AA/BAR.TS\n',
    'getting /a/aa/bar.ts returns converted'
  )
  t.equal(
    simpleDbCache.get(aABfoo),
    '// A/AB/FOO.TS\n',
    'getting /a/ab/foo.ts returns converted'
  )

  //
  t.comment('Modifying /a/ab/foo.ts')

  await touch(aABfoo)
  t.notOk(simpleDbCache.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.equal(
    simpleDbCache.get(aAAbar),
    '// A/AA/BAR.TS\n',
    'getting /a/aa/bar.ts returns converted'
  )
  t.notOk(simpleDbCache.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')
}

test('simple-db-cache: not using memory cache', async (t) => {
  const simpleDbCache = SimpleDbCache.initSync({
    useMemoryCache: false,
    prehydrateInMemoryCache: false,
  })
  await run(t, simpleDbCache)
  t.end()
})

test('simple-db-cache: using memory not prehydrating', async (t) => {
  const simpleDbCache = SimpleDbCache.initSync({
    useMemoryCache: true,
    prehydrateInMemoryCache: false,
  })
  await run(t, simpleDbCache)
  t.end()
})

test('simple-db-cache: using memory and prehydrating', async (t) => {
  const simpleDbCache = SimpleDbCache.initSync({
    useMemoryCache: true,
    prehydrateInMemoryCache: true,
  })
  await run(t, simpleDbCache)

  // Verify prehydrating works
  simpleDbCache.clearSync()
  await addUpperCase(simpleDbCache, aAAfoo)
  await addUpperCase(simpleDbCache, aAAbar)

  const simpleDbCacheFresh = SimpleDbCache.initSync({
    useMemoryCache: true,
    prehydrateInMemoryCache: true,
  })
  t.ok(simpleDbCacheFresh.inMemory.has(aAAfoo), 'prehydrates aAAfoo')
  t.ok(simpleDbCacheFresh.inMemory.has(aAAbar), 'prehydrates aAAbar')
  t.notOk(simpleDbCacheFresh.inMemory.has(aABfoo), 'does not prehydrate aABfoo')

  t.end()
})
