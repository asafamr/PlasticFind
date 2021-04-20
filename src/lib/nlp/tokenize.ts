import  {split,findSpans, BasicSpan} from "unicode-default-word-boundary";

export function tokenize(s: string): string[] {
  return split(s).filter(onlyWordsFilter);
}

export function tokenizeSpans(s: string): IterableIterator<BasicSpan> {
  return findSpans(s);
}

const notWords = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
function onlyWordsFilter(s: string) {
  if (notWords.includes(s)) {
    return false;
  }
  return true;
}
