import "ts-jest";
import { setupServer } from "msw/node";
import { FuzzyVocabProvider } from "./FuzzyVocabProvider";
import { rest } from "msw";
import { RequestManagerImp } from "../helpers/RequestManager";
import { Deferred } from "../helpers/Deferred";

// beforeEach(() => {
const server = setupServer();
beforeAll(() => server.listen());

// Reset any runtime request handlers we may add during the tests.
afterEach(() => server.resetHandlers());

// Disable API mocking after the tests are done.
afterAll(() => server.close());

// beforeEach(() => {
//   jest.useFakeTimers()
// })
// afterEach(() => {
//   jest.runOnlyPendingTimers()
//   jest.useRealTimers()
// })

const SOME_SERVER = "http://localhost";

test("FuzzyVocabProvider should fetch prefix, frequents and raw form", async () => {
  server.use(
    rest.get(`${SOME_SERVER}/frequent.json`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(["kebab", "pizza", "burgers"]));
    }),
    rest.get(`${SOME_SERVER}/prefix/ba.json`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(["bananas", "bamboo"]));
    })
  );
  const requestManager = new RequestManagerImp();
  const ff = new FuzzyVocabProvider(
    requestManager,
    `${SOME_SERVER}/prefix`,
    `${SOME_SERVER}/frequent.json`,
    10,
    10
  );

  await expect(
    ff.getCompletionsForWord("ba").then((x) => x.map((y) => y.word))
  ).resolves.toEqual(["bamboo", "bananas", "kebab"]);
});

test("FuzzyVocabProvider handle missing prefix", async () => {
  const requestManager = new RequestManagerImp();
  const ff = new FuzzyVocabProvider(
    requestManager,
    `${SOME_SERVER}/prefix`,
    `${SOME_SERVER}/frequent.json`,
    10,
    10
  );

  let failed = false;
  server.use(
    rest.get(`${SOME_SERVER}/frequent.json`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(["kebab", "pizza", "burgers"]));
    }),
    rest.get(`${SOME_SERVER}/prefix/pi.json`, (req, res, ctx) => {
      failed = true;
      return res(ctx.status(500), ctx.json({ message: "nah" }));
    })
  );
  await expect(
    ff.getCompletionsForWord("pi").then((x) => x.map((y) => y.word))
  ).resolves.toEqual(["pizza"]);
  expect(failed).toBeTruthy();
});

test("FuzzyVocabProvider prefix should not hang and retry", async () => {
  const requestManager = new RequestManagerImp();
  const ff = new FuzzyVocabProvider(
    requestManager,
    `${SOME_SERVER}/prefix`,
    `${SOME_SERVER}/frequent.json`,
    10,
    10
  );
  const def = new Deferred();

  server.use(
    rest.get(`${SOME_SERVER}/frequent.json`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(["kebab", "pizza", "burgers"]));
    }),
    rest.get(`${SOME_SERVER}/prefix/pi.json`, async (req, res, ctx) => {
      await def.promise;
      return res(ctx.status(200), ctx.json(["pico"]));
    })
  );
  await expect(
    ff.getCompletionsForWord("pi").then((x) => x.map((y) => y.word))
  ).resolves.toEqual(["pizza"]);

  def.resolve(1);

  // cache words when prefix failed?
  // server.resetHandlers();

  // server.use(
  //   rest.get(`${SOME_SERVER}/frequent.json`, (req, res, ctx) => {
  //     return res(ctx.status(200), ctx.json(["kebab", "pizza", "burgers"]));
  //   }),
  //   rest.get(`${SOME_SERVER}/prefix/pi.json`, async (req, res, ctx) => {
  //     return res(ctx.status(200), ctx.json(["pico"]));
  //   })
  // );
  // await expect(
  //   ff.getCompletionsForWord("pi").then((x) => x.map((y) => y.word))
  // ).resolves.toEqual(["pi","pizza","pico"]);
});
