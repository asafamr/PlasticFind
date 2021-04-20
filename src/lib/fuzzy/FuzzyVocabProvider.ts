import type { RequestManager } from "../helpers/RequestManager";
import LRU from "../helpers/LRU";
import { FuzzyCorpus, Suggestion } from "./FuzzyCorpus"

/**
 * fetches fuzzy corpora data by prefix, creates and handles FuzzyCorpus instances 
 */
export class FuzzyVocabProvider {
  protected completerLRU: LRU<FuzzyCorpus>;
  protected suggestionLRU: LRU<Suggestion[]>;
  protected frequentVocabCompleter: Promise<FuzzyCorpus>;

  constructor(
    protected requestManager: RequestManager,
    protected prefixUrl: string,
    frequentVocabUrl: string,
    protected nCompletions = 3,
    lruSize = 10
  ) {
    this.completerLRU = new LRU<FuzzyCorpus>(lruSize);
    this.suggestionLRU = new LRU<Suggestion[]>(lruSize);
    this.frequentVocabCompleter = requestManager
      .getJson(frequentVocabUrl, {retries:20, retryDelay:50})
      .then((res: string[]) => new FuzzyCorpus(res));
    this.suggestionLRU = new LRU<Suggestion[]>(lruSize);
  }

  public async getCompletionsForWord(word: string): Promise<Suggestion[]> {
    return this.suggestionLRU.get(word, () => this.createCompletions(word));
  }

  protected async createCompletions(word: string): Promise<Suggestion[]> {
    const originalWordSuggestion: Suggestion = { word, score: 1 };

    const suggestionPromises: Promise<Suggestion[]>[] = [
      // Promise.resolve([originalWordSuggestion]),
    ];

    const freqPromise = this.frequentVocabCompleter.then((comp) =>
      comp.getCompletions(word, { count: this.nCompletions, scoreFactor: 0.9 })
    );

    suggestionPromises.push(freqPromise);
    if (word.length >= 2) {
      // TODO: Unicode grapheme handling
      const prefix = word.slice(0, 2).toLowerCase();
      const prefixPromise = this.completerLRU
        .get(prefix, () => this.getPrefixCompleter(prefix))
        .then((comp) =>
          comp.getCompletions(word, {
            count: this.nCompletions,
            scoreFactor: 0.8,
          })
        );
      suggestionPromises.push(prefixPromise);
    }
    const res = await Promise.allSettled(suggestionPromises);
    return FuzzyCorpus.mergeSuggestions(
      res.flatMap((x) => (x.status === "fulfilled" ? x.value : []))
    ).slice(0, this.nCompletions);
  }

  protected async getPrefixCompleter(prefix: string): Promise<FuzzyCorpus> {
    return this.requestManager
      .getJson(`${this.prefixUrl}/${prefix}.json`, {retries:1, timeoutMs:1000})
      .then((res: string[]) => new FuzzyCorpus(res));
  }
}
