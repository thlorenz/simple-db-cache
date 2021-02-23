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
    prehydrateInMemoryCache: true,
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

When `prehydrateInMemoryCache` is set all files will be fetched from the
database via a `SELECT * ...` query and stored in memory. This is a lot faster
than querying for each file, but comes at the cost of a higher memory
footprint.

## TODO

Add `evictOnMemoryRead` which will remove items from the memory cache
after they are retrieved for the first time.


## LICENSE

MIT
