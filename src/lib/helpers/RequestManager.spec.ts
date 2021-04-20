import "ts-jest";
import { setupServer } from "msw/node";
import { RequestManagerImp } from "./RequestManager";
import { rest } from "msw";

// beforeEach(() => {
const server = setupServer();
beforeAll(() => server.listen());

// Reset any runtime request handlers we may add during the tests.
afterEach(() => server.resetHandlers());

// Disable API mocking after the tests are done.
afterAll(() => server.close());

const SOME_ENDPOINT = "http://localhost/abc";

test("fetch timeout", async () => {
  server.use(
    rest.get(SOME_ENDPOINT, (req, res, ctx) => {
      return res(ctx.delay(200), ctx.status(200), ctx.json({ message: "ok" }));
    })
  );
  const rm = new RequestManagerImp();

  const f = rm.getJson(SOME_ENDPOINT, {retries:10, timeoutMs:100});
  await expect(f).rejects.toEqual({ message: "Timeout of 100ms." });
});

test("fetch retry", async () => {
  let count = -1;
  server.use(
    rest.get(SOME_ENDPOINT, (req, res, ctx) => {
      count += 1;
      if (count < 5) {
        return res(ctx.status(500), ctx.json({ message: "Error" }));
      }
      return res(ctx.status(200), ctx.json({ message: "ok" }));
    })
  );
  const rm = new RequestManagerImp();

  await expect(rm.getJson(SOME_ENDPOINT, {retries:3})).rejects.toHaveProperty(
    "response.status",
    500
  );
  await expect(rm.getJson(SOME_ENDPOINT, {retries:1})).resolves.toEqual({
    message: "ok",
  });
});
