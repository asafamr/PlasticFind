import "ts-jest";
import { Deferred } from "./Deferred";
import LRU from "./LRU";
test("lru size", async () => {
  let counter = 0;
  const creator = async () => ++counter;
  const lru = new LRU<number>(2);
  const a = await lru.get("a", creator);
  const b = await lru.get("b", creator);
  const c = await lru.get("c", creator); // should evict a
  const a2 = await lru.get("a", creator); // should miss
  const c2 = await lru.get("c", creator); // should hit previous c

  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(c).toBe(3);
  expect(a2).toBe(4);
  expect(c2).toBe(3);
});

test("lru in progress", async () => {
  let def = new Deferred<number>();
  let waiter = new Deferred<number>();

  const lru = new LRU<number>(2);
  const a = lru.get("a", () => def.promise);
  lru
    .get("a", async () => 1)
    .then((res) => {
      expect(res).toEqual(123456789);
      waiter.resolve(res);
    });

  def.resolve(123456789);
  const last = await lru.get("a", async () => 1);
  expect(last).toBe(123456789);
  await waiter.promise;
});
