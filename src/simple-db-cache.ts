import { strict as assert } from 'assert'
import { tmpdir } from 'os'
import BetterSqlite3 from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import debug from 'debug'

const logDebug = debug('sdb-cache:debug')
const logTrace = debug('sdb-cache:trace')

const DEFAULT_CACHE_DIR = tmpdir()

type CacheItem = {
  content: string
  added: Date
}

const SQL_CREATE = `
  CREATE TABLE IF NOT EXISTS file_cache (
    file    TEXT,
    added   TEXT,
    content BLOB
  );
  CREATE UNIQUE INDEX IF NOT EXISTS file_idx ON file_cache (file);
`

const SQL_DROP = `DROP TABLE IF EXISTS file_cache;`

export type SimpleDbCacheOpts = {
  useMemoryCache: boolean
  hydrateMemoryCache: boolean
  evictMemoryOnRead: boolean
  cacheDir: string
}

export class SimpleDbCache {
  private readonly _db: BetterSqlite3.Database
  private readonly _memoryCache: Map<string, CacheItem> = new Map()
  private constructor(private readonly _opts: SimpleDbCacheOpts) {
    this._db = new BetterSqlite3(
      path.join(this._opts.cacheDir, 'simple-db-cache.sqlite'),
      { verbose: logTrace, fileMustExist: false }
    )
    this._create()
    if (this._opts.hydrateMemoryCache) {
      this._hydrateMemoryCache()
    }
  }

  get memoryCache() {
    return this._memoryCache
  }

  static initSync(args: Partial<SimpleDbCacheOpts> = {}) {
    const cacheDir = args.cacheDir ?? DEFAULT_CACHE_DIR
    const useMemoryCache = args.useMemoryCache ?? true
    const hydrateMemoryCache = args.hydrateMemoryCache ?? false
    const evictOnMemoryRead = args.evictMemoryOnRead ?? false

    const opts: SimpleDbCacheOpts = {
      cacheDir,
      useMemoryCache,
      hydrateMemoryCache,
      evictMemoryOnRead: evictOnMemoryRead,
    }

    assert(
      opts.useMemoryCache || !opts.hydrateMemoryCache,
      'can only hydrate in memory cache if we use it'
    )
    fs.mkdirSync(cacheDir, { recursive: true })
    return new SimpleDbCache(opts)
  }

  get(fullPath: string): string | undefined {
    const { mtime } = fs.statSync(fullPath)

    if (this._opts.useMemoryCache) {
      const fromMemory = this._memoryCache.get(fullPath)
      if (fromMemory != null) {
        if (this._opts.evictMemoryOnRead) {
          this._memoryCache.delete(fullPath)
        }
        if (fromMemory.added > mtime) {
          logDebug('getting %s from memory cache', fullPath)
          return fromMemory.content
        }
      }
    }

    const fromDb = this._getFromDb(fullPath)
    if (fromDb != null && fromDb.added > mtime) {
      logDebug('getting %s from database', fullPath)

      // Only add to memory if we plan to read it later which is not the case when evicting
      if (this._opts.useMemoryCache && !this._opts.evictMemoryOnRead) {
        this._memoryCache.set(fullPath, fromDb)
      }
      return fromDb.content
    }

    logDebug('%s not found', fullPath)
  }

  add(origFullPath: string, convertedContent: string) {
    logDebug('adding %s', origFullPath)

    const cacheItem = { content: convertedContent, added: new Date() }
    if (this._opts.useMemoryCache) {
      this._memoryCache.set(origFullPath, cacheItem)
    }

    const stmt = this._db.prepare(
      'INSERT INTO file_cache (file, content, added) VALUES (?, ?, ?)'
    )
    stmt.run(origFullPath, cacheItem.content, cacheItem.added.toISOString())
  }

  clearSync() {
    this._memoryCache.clear()
    this._db.exec(SQL_DROP).exec(SQL_CREATE)
  }

  private _create() {
    logDebug('creating file_cache table')
    this._db.exec(SQL_CREATE)
  }

  private _getFromDb(fullPath: string): CacheItem | undefined {
    const stmt = this._db.prepare(
      'SELECT content, added FROM file_cache WHERE file = ?'
    )
    const res = stmt.get(fullPath)
    if (res == null) return undefined

    const { content, added: addedStr } = res
    const added = new Date(addedStr)
    return { content, added }
  }

  private _hydrateMemoryCache() {
    logDebug('hydrating in memory cache')
    const stmt = this._db.prepare('SELECT * FROM file_cache')
    const rows: (CacheItem & { file: string })[] = stmt.all()
    for (const { file, content, added: addedStr } of rows) {
      const added = new Date(addedStr)
      this._memoryCache.set(file, { content, added })
    }
  }
}
