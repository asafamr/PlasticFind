import { Deferred } from "./Deferred";

interface Item<T> {
  key: string;
  value: T;
}

// export const IN_PROGRESS = Symbol("IN_PROGRESS");

class LRU<T> {
  protected items: Item<T>[] = [];
  protected inprogress: Record<string, Promise<T>> = {};

  constructor(public size = 10) {}
  public async get(this: this, key: string, onMissGetter: () => Promise<T>) {
    const found = this.items.find((x) => x.key === key);
    if (found) return found.value;
    if (this.inprogress[key]) {
      return this.inprogress[key];
    }
    const promise = onMissGetter()
      .then((res) => {
        this.items = [{ key, value: res }, ...this.items].slice(0, this.size);
        return res;
      })
      .finally(() => {
        if (this.inprogress[key]) delete this.inprogress[key];
      });
    this.inprogress[key] = promise;

    return promise;
  }
}

export default LRU;
