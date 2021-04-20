import "ts-jest";
import { stem } from "./stem";
import { tokenize } from "./tokenize";

test("stemmer should stem (Porter stemmer)", async () => {
  expect(stem("working")).toEqual("work");
  expect(stem("100,000,000")).toEqual("100,000,000");
  expect(stem("10.1007")).toEqual("10.1007");
  expect(stem("5d's")).toEqual("5d'");
  expect(stem("5th")).toEqual("5th");
  expect(stem("o.b")).toEqual("o.b");
  expect(stem("o'brian")).toEqual("o'brian");
  expect(stem("obsequious")).toEqual("obsequi");
});


test("stemmer should stem like elastic (UAX#29)", async () => {
  const text=`
  Hello-looo this12text is herE TO
     
          
  test tokeneee!nization!!
  `
  
  const elasticTokenized = [
    "hello",
    "looo",
    "this12text",
    "is",
    "here",
    "to",
    "test",
    "tokenee",
    "nizat"
  ]
    expect(tokenize(text).map(stem)).toEqual(elasticTokenized);
  });
  