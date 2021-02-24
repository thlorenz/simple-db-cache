# simple-db-cache [![](https://github.com/thlorenz/simple-db-cache/workflows/Node/badge.svg?branch=master)](https://github.com/thlorenz/simple-db-cache/actions)

Simple Db Cache based on mtime.

## Example

```typescript
import path from 'path'
import { strict as assert } from 'assert'
import { SimpleDbCache } from 'simple-db-cache'
  
function doMyThing(projectRoot: string) {
  const dirtSimpleDbCache =  SimpleDbCache.initSync({
    useMemoryCache: true,
    hydrateMemoryCache: true,
  })
  
  const foo = path.join(projectRoot, '/some/file/foo.ts')
  const bar = path.join(projectRoot, '/some/file/bar.ts')

  const converted = convertMyFile(foo)
  dirtSimpleDbCache.add(foo, converted)
  
  const cachedFoo = dirtSimpleFileCache.get(foo)
  const cachedBar = dirtSimpleFileCache.get(bar)
  
  assert(cachedFoo === converted)
  assert(cachedBar == null)
}
```

The above works across runs as the cache is persisted to a tmp folder.

## In Memory Cache

When `useMemoryCache` is set files will be kept in memory after they are
fetched from the Database for the next use.

When `hydrateMemoryCache` is set all files will be fetched from the
database via a `SELECT * ...` query and stored in memory. This is a lot faster
than querying for each file, but comes at the cost of a higher memory
footprint.

When `evictMemoryOnRead` is set then entries are removed from the in memory cache when the are
retrieved the same time. Additionally if they are retrieved from the database they are NOT
added to the in memory cache.

## LICENSE

MIT
