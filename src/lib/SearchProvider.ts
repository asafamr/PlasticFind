import { FuzzyVocabProvider } from "./fuzzy/FuzzyVocabProvider";
import { RequestManager, RequestManagerImp } from "./helpers/RequestManager";
import { tokenize } from "./nlp/tokenize";
import { TermFetcher, TermQuery } from "./TermFetcher";
import _debug from "debug";
import type { Suggestion } from "./fuzzy/FuzzyCorpus";
const debug = _debug("SP");

/**
 *
 */
export class SearchProvider {
  requestManager: RequestManager;
  fuzzyProvider: FuzzyVocabProvider;
  termFetcher: TermFetcher;
  constructor(
    termResultsUrl: string,
    frequentVocabUrl: string,
    prefixVocabUrl: string,
    version: string,
    overrideRequestManager?: RequestManager
  ) {
    this.requestManager =
      overrideRequestManager ?? new RequestManagerImp(version);
    this.fuzzyProvider = new FuzzyVocabProvider(
      this.requestManager,
      prefixVocabUrl,
      frequentVocabUrl,
      3,
      10
    );
    this.termFetcher = new TermFetcher(this.requestManager, termResultsUrl, 10);
  }

  public async getCompletionsForPrefix(
    pref: string
  ): Promise<Suggestion[]> {
    return this.fuzzyProvider
      .getCompletionsForWord(pref)
      .catch((e) => {
        debug(e);
        return [];
      });
  }

  public async doSearch(
    query: string,
    maxNum: number = 10 /*, location in string?*/
  ) {
    const termsRaw = tokenize(query);
    const suggestions = await Promise.all(
      termsRaw.map((x) => this.getCompletionsForPrefix(x))
    );
    return this.termFetcher.getSearchResults(
      suggestions.map(
        (sug, i) =>
          <TermQuery>{
            term: termsRaw[i],
            fallbackTerm: sug[0]?.word,
            weight: 1,
          }
      ),
      maxNum
    );
  }
}
