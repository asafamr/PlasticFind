import "ts-jest";
import { setupServer } from "msw/node";
import { rest } from "msw";
import { TermFetcher } from "./TermFetcher";
import { RequestManagerImp } from "./helpers/RequestManager";

// beforeEach(() => {
const server = setupServer();
beforeAll(() => {
  server.listen();
  server.use(
    rest.get(`${SOME_ENDPOINT_PREFIX}/doc%27.json`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(getDocQuoteJson()));
    }),
    rest.get(`${SOME_ENDPOINT_PREFIX}/conjunct.json`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(getFluxJson()));
    }),
    rest.get(`${SOME_ENDPOINT_PREFIX}/delorean.json`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(getDeloreanJson()));
    })
  );
});

// Reset any runtime request handlers we may add during the tests.
// afterEach(() => server.resetHandlers());

// Disable API mocking after the tests are done.
afterAll(() => server.close());

const SOME_ENDPOINT_PREFIX = "http://localhost/abc";

test("fetch one term", async () => {
  const rm = new RequestManagerImp();
  const tf = new TermFetcher(rm, SOME_ENDPOINT_PREFIX);
  const res = await tf.getSearchResults([
    { term: "doc's", weight: 0.9 },
    { term: "doc's", weight: 1.1 },
  ]);
  await expect(res.map((r) => r.score.toFixed(2))).toEqual([
    "3.36",
    "2.78",
    "1.95",
  ]);

  // expect(res[0].highlights[0].txt).toEqual(
  //   "la Reguera as María, <em>Doc's</em> wife Walton Goggins"
  // );
});

test("fetch join two terms", async () => {
  const rm = new RequestManagerImp();
  const tf = new TermFetcher(rm, SOME_ENDPOINT_PREFIX);
  const res = await tf.getSearchResults([
    { term: "doc's", weight: 0.9 },
    { term: "conjunction", weight: 1.2 },
  ]);

  expect(res[0].score).toBeCloseTo(2.527 * 0.9 + 1.4031 * 1.2, 2);
  // expect(res[0].highlights[0].terms.map((x) => x.term).sort()).toEqual([
  //   "conjunct",
  //   "doc'",
  // ]);
  // expect(res[0].highlights[0].txt).toEqual(
  //   "notebook has all of <em>Doc's</em> plans for the <em>flux</em> capacitor and the DeLorean"
  // );
});

test("fetch join three terms", async () => {
  const rm = new RequestManagerImp();
  const tf = new TermFetcher(rm, SOME_ENDPOINT_PREFIX);
  const res = await tf.getSearchResults([
    { term: "delorean", weight: 1 },
    { term: "doc's", weight: 1 },
    { term: "conjunction", weight: 1 },
    { term: "missingstem", weight: 1.2 },
  ]);

  expect(res[0].score).toBeCloseTo(2.527 + 1.4031 + 2.1317, 2);
  // expect(res[0].highlights[0].terms.map((x) => x.term).sort()).toEqual([
  //   "conjunct",
  //   "delorean",
  //   "doc'",
  // ]);
  // expect(res[0].highlights[0].txt).toEqual(
  //   "notebook has all of <em>Doc's</em> plans for the <em>flux</em> capacitor and the <em>DeLorean</em>. I'd better make sure"
  // );
});

function getDocQuoteJson() {
  return [
    {
      id: "128889",
      sc: 3.0536342,
      hl: [
        {
          txt: "la Reguera as Mar\u00eda, <em>Doc's</em> wife Walton Goggins",
          f: "text",
          from: 202,
          to: 209,
        },
      ],
      ti: "Cowboys & Aliens",
    },
    {
      id: "201863",
      sc: 2.5277905,
      hl: [
        {
          txt: "notebook has all of <em>Doc's</em> plans for the flux",
          f: "text",
          from: 125,
          to: 133,
        },
        {
          txt: "It's supposed to have <em>Doc's</em> notes for building a",
          f: "text",
          from: 175,
          to: 183,
        },
        {
          txt: " According to this, <em>Doc's</em> gonna get killed on",
          f: "text",
          from: 284,
          to: 292,
        },
      ],
      ti: "Back to the Future: The Game",
    },

    {
      id: "3321",
      sc: 1.7715211,
      hl: [
        {
          txt: "made out. [Wyatt finds <em>Doc's</em> deputy badge on",
          f: "text",
          from: 1626,
          to: 1633,
        },
        {
          txt: " Wyatt Earp: [takes <em>Doc's</em> hand] Thanks for",
          f: "text",
          from: 1778,
          to: 1785,
        },
      ],
      ti: "Tombstone (film)",
    },
  ];
}
function getFluxJson() {
  return [
    {
      id: "221441",
      sc: 1.456256,
      hl: [
        {
          txt:
            "identity itself is always in <em>flux</em>\u2026 On his decision of",
          f: "text",
          from: 67,
          to: 76,
        },
      ],
      ti: "Ariel Dorfman",
    },
    {
      id: "85898",
      sc: 1.429568,
      hl: [
        {
          txt: '336) "The Great God <em>Flux</em>". I am an artist,',
          f: "text",
          from: 967,
          to: 975,
        },
        {
          txt: '338) "The Great God <em>Flux</em>". There\'s Wyndham Lewis',
          f: "text",
          from: 1134,
          to: 1141,
        },
      ],
      ti: "Wyndham Lewis",
    },
    {
      id: "152749",
      sc: 1.4204549,
      hl: [
        {
          txt: "us that everything is in <em>flux</em>. Our fight to redress",
          f: "text",
          from: 89,
          to: 98,
        },
      ],
      ti: "Mahmoud al-Zahar",
    },
    {
      id: "214735",
      sc: 1.4204063,
      hl: [
        {
          txt:
            "represents the directional energy <em>flux</em> of an electromagnetic field",
          f: "text",
          from: 5,
          to: 12,
        },
      ],
      ti: "Poynting vector",
    },
    {
      id: "201863",
      sc: 1.4031373,
      hl: [
        {
          txt: "Doc's plans for the <em>flux</em> capacitor and the DeLorean",
          f: "text",
          from: 129,
          to: 136,
        },
      ],
      ti: "Back to the Future: The Game",
    },
  ];
}

function getDeloreanJson() {
  return [
    {
      id: "201863",
      sc: 2.1317976,
      hl: [
        {
          txt: "flux capacitor and the <em>DeLorean</em>. I'd better make sure",
          f: "text",
          from: 133,
          to: 141,
        },
      ],
      ti: "Back to the Future: The Game",
    },
    {
      id: "967",
      sc: 1.9331088,
      hl: [
        {
          txt: "the future on his <em>DeLorean</em> time machine] Doc:",
          f: "text",
          from: 565,
          to: 572,
        },
        {
          txt: "machine... out of a <em>DeLorean</em>? Doc: The way I",
          f: "text",
          from: 703,
          to: 711,
        },
      ],
      ti: "Back to the Future",
    },
    {
      id: "11835",
      sc: 1.8035865,
      hl: [
        {
          txt: "tow truck to get the <em>DeLorean</em> out of the mine",
          f: "text",
          from: 119,
          to: 128,
        },
      ],
      ti: "Back to the Future Part III",
    },
    {
      id: "11833",
      sc: 1.6987792,
      hl: [
        {
          txt: "after you saw the <em>DeLorean</em> struck by lightning.",
          f: "text",
          from: 609,
          to: 616,
        },
      ],
      ti: "Back to the Future Part II",
    },
    {
      id: "57034",
      sc: 1.5764118,
      hl: [
        {
          txt: "throw you into my <em>DeLorean</em>, gun it to 88.",
          f: "text",
          from: 716,
          to: 724,
        },
      ],
      ti: "Knocked Up",
    },
    {
      id: "165572",
      sc: 1.0020901,
      hl: [
        {
          txt:
            'the Tardis, getting my <em>Delorean</em> ready!" "Max... Imagine',
          f: "text",
          from: 2062,
          to: 2069,
        },
      ],
      ti: "Life Is Strange",
    },
    {
      id: "191179",
      sc: 0.70941484,
      hl: [
        {
          txt: "man didn't own a <em>DeLorean</em> and is from the",
          f: "text",
          from: 4480,
          to: 4488,
        },
      ],
      ti: "Hawaii Five-0 (season 2)",
    },
    {
      id: "174884",
      sc: 0.44838908,
      hl: [
        {
          txt: "their hands on some <em>DeLoreans</em>? How did I get",
          f: "text",
          from: 1557,
          to: 1565,
        },
      ],
      ti: "Supernatural (season 4)",
    },
    {
      id: "193451",
      sc: 0.4144653,
      hl: [
        {
          txt: "the Doc to hide the <em>DeLorean</em>] What an eccentric",
          f: "text",
          from: 223,
          to: 231,
        },
      ],
      ti: "Lego Dimensions",
    },
    {
      id: "110343",
      sc: 0.3757154,
      hl: [
        {
          txt: " or does the <em>DeLorean</em> ever make an",
          f: "text",
          from: 32940,
          to: 32947,
        },
        {
          txt: " the <em>DeLorean</em>. Yes, the <em>DeLorean</em> makes",
          f: "text",
          from: 33315,
          to: 33321,
        },
        {
          txt: "lightning to hit the <em>DeLorean</em> to generate the",
          f: "text",
          from: 33379,
          to: 33386,
        },
        {
          txt: "Back to the Future <em>DeLorean</em> and then there's",
          f: "text",
          from: 53561,
          to: 53568,
        },
      ],
      ti: "The Angry Video Game Nerd",
    },
    {
      id: "183639",
      sc: 0.24664682,
      hl: [
        {
          txt: 'the Future" of the <em>DeLorean</em> picking up speed',
          f: "text",
          from: 13863,
          to: 13870,
        },
      ],
      ti: "The Nostalgia Critic/Season 3",
    },
    {
      id: "17562",
      sc: 0.11938421,
      hl: [
        {
          txt: "Patrick Kielty: [On the <em>Delorean</em>] Ok, look. I'm",
          f: "text",
          from: 15930,
          to: 15937,
        },
        {
          txt: 'my car into a <em>DeLorean</em>!" [The Top Gear',
          f: "text",
          from: 68443,
          to: 68450,
        },
      ],
      ti: "Top Gear",
    },
  ];
}
