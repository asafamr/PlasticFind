import LRU from "./helpers/LRU";
import { stem } from "./nlp/stem";
import type { RequestManager } from "./helpers/RequestManager";
import { percentEncode } from "./helpers/utils";

export type TermQuery = {
  term: string;
  fallbackTerm?: string;
  weight: number;
};

// export type Highlight = {
//   terms: { term: string; score: number }[];
//   from: number;
//   to: number;
//   txt: string;
//   field: string;
// };

export type TermResult = {
  docId: string;
  title: string;
  terms: string[];
  // highlights: Highlight[];
  score: number;
};

export class TermFetcher {
  protected termResultsLru: LRU<TermResult[]>;
  constructor(
    protected requestManager: RequestManager,
    protected wordUrlPrefix: string,
    lruSize = 20
  ) {
    this.termResultsLru = new LRU<TermResult[]>(lruSize);
  }

  public async getSearchResults(
    termsQuery: TermQuery[],
    maxNum: number = 10
  ): Promise<TermResult[]> {
    const stemmedQuery: TermQuery[] = [];
    for (const { term, weight, fallbackTerm } of termsQuery) {
      const stemmed = stem(term);
      const stemmedFb = fallbackTerm && stem(fallbackTerm);
      const current = stemmedQuery.find((x) => x.term === stemmed);
      if (current) {
        current.weight = Math.max(weight, current.weight);
      } else {
        stemmedQuery.push({ term: stemmed, fallbackTerm: stemmedFb, weight });
      }
    }

    const allResults = await Promise.allSettled(
      stemmedQuery.map(({ term, fallbackTerm }) =>
        Promise.allSettled([
          this.termResultsLru.get(term, () => this.fetchTermResults(term)),
          fallbackTerm
            ? this.termResultsLru.get(fallbackTerm, () =>
                this.fetchTermResults(fallbackTerm)
              )
            : Promise.reject(),
        ])
      )
    ).then((res) =>
      res.flatMap((p, i) => {
        if (p.status === "rejected") {
          //TODO: handle rejections?
          return [];
        }
        const [termProm, fallbackTermProm] = p.value;
        if (
          termProm.status === "rejected" &&
          fallbackTermProm.status === "rejected"
        ) {
          //TODO: handle rejections?
          return [];
        }
        let weight = stemmedQuery[i].weight;
        let termResults;
        if (termProm.status !== "rejected") {
          termResults = termProm.value;
        } else if (fallbackTermProm.status !== "rejected") {
          termResults = fallbackTermProm.value;
          weight *= 0.5;
        }
        return termResults.map(
          (x: TermResult) => <TermResult>{ ...x, score: x.score * weight }
        );
      })
    );

    return this.joinTermsScores(allResults).slice(0, maxNum);
  }

  protected joinTermsScores(termsRes: TermResult[]): TermResult[] {
    const byId: Record<string, TermResult> = {};
    const ret: TermResult[] = [];

    for (const res of termsRes) {
      if (byId[res.docId]) {
        const current = byId[res.docId];
        current.score += res.score;
        current.terms = Array.from(new Set([...res.terms, ...current.terms]));
        // current.highlights = this.joinHighlights(
        //   current.highlights,
        //   res.highlights
        // );
      } else {
        const clone = { ...res };
        ret.push(clone);
        byId[res.docId] = clone;
      }
    }
    return ret.sort((a, b) => b.score - a.score);
  }

  // protected joinHighlights(
  //   highlightsOld: Highlight[],
  //   highlightsNew: Highlight[]
  // ): Highlight[] {
  //   const byField: Record<string, Highlight[]> = {};
  //   const ret: Highlight[] = [];
  //   for (const hl of [...highlightsOld, ...highlightsNew]) {
  //     byField[hl.field] = byField[hl.field] || [];
  //     byField[hl.field].push(hl);
  //   }
  //   for (const field of Object.keys(byField)) {
  //     const fieldHighlights = byField[field];
  //     fieldHighlights.sort((a, b) => a.from - b.from);
  //     let mergedHl = byField[field][0];
  //     for (const hl of fieldHighlights.slice(1)) {
  //       if (hl.from > mergedHl.to + 1) {
  //         ret.push(mergedHl);
  //         mergedHl = hl;
  //       } else {
  //         mergedHl = this.mergeOverlappingHighlights(mergedHl, hl);
  //       }
  //     }
  //     ret.push(mergedHl);
  //   }
  //   return ret.sort(
  //     (a, b) =>
  //       b.terms.reduce((acum, x) => acum + x.score, 0) -
  //       a.terms.reduce((acum, x) => acum + x.score, 0)
  //   );
  // }

  // protected mergeOverlappingHighlights(
  //   startingFirst: Highlight,
  //   startingSecond: Highlight
  // ): Highlight {
  //   // TODO unicode tokenization
  //   if (
  //     startingFirst.from === -1 ||
  //     startingFirst.to === -1 ||
  //     startingSecond.from === -1 ||
  //     startingSecond.to === -1
  //   ) {
  //     // edgecase - no token indices were found, possibly a one word title
  //     return startingFirst;
  //   }
  //   const toEmph = (startingFirst.txt + startingSecond.txt)
  //     .match(/<em>([^<]+)<\/em>/g)
  //     .map((x) => x.slice(4, -5));
  //   const txt1 = startingFirst.txt.replace(/<\/?em>/g, " ");
  //   const txt2 = startingSecond.txt.replace(/<\/?em>/g, " ");

  //   let tokens = txt1.split(" ").filter((x) => x !== "");
  //   if (startingSecond.to > startingFirst.to) {
  //     tokens = tokens.concat(
  //       txt2
  //         .split(" ")
  //         .filter((x) => x !== "")
  //         .slice(startingFirst.to - startingSecond.from + 1)
  //     );
  //   }
  //   const fullText = tokens
  //     .map((t) => (toEmph.includes(t) ? `<em>${t}</em>` : t))
  //     .join(" ")
  //     .replace(/<\/em> ([.,!])/g, "</em>$1");

  //   return {
  //     txt: fullText,
  //     field: startingFirst.field,
  //     from: startingFirst.from,
  //     to: Math.max(startingFirst.to, startingSecond.to),
  //     terms: [...startingFirst.terms, ...startingSecond.terms],
  //   };
  // }

  protected async fetchTermResults(term: string): Promise<TermResult[]> {
    const percentEncoded = percentEncode(term);
    const res = await this.requestManager
      .getJson(`${this.wordUrlPrefix}/${percentEncoded}.json`, {})
      .catch((err) => {
        if (err?.response?.status === 404) {
          console.log(`%c 404 Not Found errors are expected`, "color: green");
        }
        throw err;
      });
    return (res as unknown[]).map(
      (r) =>
        <TermResult>{
          docId: r["id"],
          score: r["sc"],
          title: r["ti"],
          terms: [term],
          // highlights: r["hl"].map(
          //   (hl) =>
          //     <Highlight>{
          //       txt: hl["txt"],
          //       terms: [{ term, score: r["sc"] }],
          //       from: hl["from"],
          //       to: hl["to"],
          //       field: hl["f"],
          //     }
          // ),
        }
    );
  }
}
