import ps from "porter-stemmer";

const stemmer = ps.stemmer;
export function stem(word: string):string {
  return stemmer(word.toLowerCase());
}
