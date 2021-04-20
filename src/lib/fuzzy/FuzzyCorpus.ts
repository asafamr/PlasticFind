import fuzzysort from "fuzzysort";
export interface Suggestion {
  word: string;
  score: number;
}
/**
 * create fuzzy completions from a subset of vocabulary strings
 * many FuzzyCorpus are handled by one FuzzyVocabProvider (e.g. by prefix)
 */
export class FuzzyCorpus {
  protected prepArr: Fuzzysort.Prepared[];
  public constructor(strs: string[]) {
    this.prepArr = strs.map(fuzzysort.prepare);
  }

  public static mergeSuggestions(...sug: Suggestion[][]): Suggestion[] {
    const found: Record<string, Suggestion> = {};
    for (const s of [].concat.apply(
      [],
      sug.map((x) => x ?? [])
    )) {
      if (!found[s.word] || found[s.word].score < s.score) {
        found[s.word] = s;
      }
    }
    // found[subword] = { word: subword, score: 1.0 };
    return Object.values(found).sort((a, b) => b.score - a.score);
  }

  public async getCompletions(
    prefix: string,
    { count = 3, scoreFactor = 1 }
  ): Promise<Suggestion[]> {
    const matches = await fuzzysort.goAsync(prefix, this.prepArr, {
      allowTypo: true,
      limit: count,
    });
    return matches.map((x) => {
      return { word: x.target, score: (1 + x.score / 10000) * scoreFactor };
    });
  }
}
