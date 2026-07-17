import { AsyncLocalStorage } from 'node:async_hooks'

export interface AppContext {
  user_id?: number
}

const storage = new AsyncLocalStorage<AppContext>()

export const context = {
  init(ctx: AppContext) {
    storage.enterWith(ctx)
  },

  get<K extends keyof AppContext>(key: K): AppContext[K] {
    return storage.getStore()?.[key]
  },

  set<K extends keyof AppContext>(key: K, value: AppContext[K]) {
    const store = storage.getStore()
    if (store) {
      store[key] = value
    }
  }
}
