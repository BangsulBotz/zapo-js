// lib/lru.js

export class LRU {
    constructor(max = 500) {
        this.max = max
        this.cache = new Map()
    }
    get(key) {
        if (!this.cache.has(key)) return undefined
        const value = this.cache.get(key)
        this.cache.delete(key)
        this.cache.set(key, value)
        return value
    }
    set(key, value) {
        if (this.cache.has(key)) this.cache.delete(key)
        this.cache.set(key, value)
        if (this.cache.size > this.max) {
            const first = this.cache.keys().next().value
            this.cache.delete(first)
        }
    }
    has(key) {
        return this.cache.has(key)
    }
    delete(key) {
        return this.cache.delete(key)
    }
    get size() {
        return this.cache.size
    }
}
