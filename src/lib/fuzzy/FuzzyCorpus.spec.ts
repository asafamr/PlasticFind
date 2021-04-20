import "ts-jest";
import { FuzzyCorpus } from "./FuzzyCorpus"
test("fuzzy completion", async () => {
  let fc = new FuzzyCorpus(['papaya','apple','apricot','banana'])
  const comps = await fc.getCompletions('ap',{count:100});
  const comps_sorted = comps.map(x=>x.word).sort((a:string,b:string)=>(a as any) - (b as any))
  expect(comps_sorted).toEqual(['apple','apricot','papaya'])
});
