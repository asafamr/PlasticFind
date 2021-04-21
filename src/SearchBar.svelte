<script lang="ts">
  import { SearchProvider } from "./lib/SearchProvider";
  import type { TermResult } from "./lib/TermFetcher";
  import { fade } from "svelte/transition";

  import WikiItem from "./WikiItem.svelte";
  import AutoCompBox from "./AutoCompBox.svelte";

  export const fuzzypath = "https://jamstack-search-demo.b-cdn.net/fuzzy";
  export const fuzzymain =
    "https://jamstack-search-demo.b-cdn.net/vocab_frequent.json";
  export const index = "https://jamstack-search-demo.b-cdn.net/search";

  const VERSION = "0.1.0";

  let getWikiText = true;

  let nQueries = 0;

  let wikiLink = "";

  const searchProvider = new SearchProvider(
    index,
    fuzzymain,
    fuzzypath,
    VERSION
  );

  let searchResultsPromise: Promise<undefined | TermResult[]> = Promise.resolve(
    undefined
  );

  // function devMessage(msg: string) {
  //   console.log(`%c ${msg}`, "color: green");
  // }
  // devMessage("404 Not Found errors are expected...");

  let queryString = "";
  const inputChanged = (e: { detail: string }) => {
    const qs = e.detail;
    nQueries += 1;
    queryString = qs;
    const nQueriesThen = nQueries;

    searchResultsPromise = searchProvider.doSearch(qs).then((res) => {
      setTimeout(() => {
        if (nQueries == nQueriesThen) {
          const firstResult = document.querySelector(".results > *");
          if (firstResult) {
            firstResult.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }
        }
      }, 100);

      // setTimeout(() => {
      //   if (nQueries == nQueriesThen && qs) {
      //     devMessage(`Possibly send an analytics event for query "${qs}"`);
      //   }
      // }, 1000);
      return res;
    });
  };

  function getCompletions(s: string): Promise<string[]> {
    return searchProvider
      .getCompletionsForPrefix(s)
      .then((r) => r.map((x) => x.word));
  }
</script>

<!-- <svelte:head>
  {#each stems as stem}
    <link rel="prefetch" href={`/hmm/${stem}.json`} />
  {/each}
</svelte:head> -->

<div class="grab-search">
  <h3>Type to search <a target="_blank" href="https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents">Wikibooks Cookbook</a>:</h3>
  <div class="search-box">
    <AutoCompBox {getCompletions} on:input={inputChanged} />
  </div>

  <div class="gwt-check">
    <input type="checkbox" id="gwt" bind:checked={getWikiText} />
    <label for="gwt"> Fetch summary after search </label>
  </div>

  <div class="results">
    {#await searchResultsPromise then res}
      {#if res}
        {#each res as item}
          <!-- <pre>
        {JSON.stringify(item,undefined,2)}
      </pre> -->
          <WikiItem
            docId={item.docId}
            title={item.title}
            getText={getWikiText}
            highlightTerms={item.terms}
            on:click={() => {
              // devMessage(
              //   `Possibly send an analytics event: clicked "${item.title}" for query "${queryString}"`
              // );
              wikiLink = `https://en.wikibooks.org/wiki/Cookbook:${item.title}`;
            }}
          />
        {/each}
      {/if}
    {/await}
  </div>
  {#if wikiLink}
    <div class="wikiframe" transition:fade={{ delay: 0, duration: 200 }}>
      <div class="wikiclose" on:click={() => (wikiLink = "")}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-2 -2 24 24"
          width="50"
          height="50"
          preserveAspectRatio="xMinYMin"
          class="icon__icon"
          ><path
            d="M11.414 10l2.829-2.828a1 1 0 1 0-1.415-1.415L10 8.586 7.172 5.757a1 1 0 0 0-1.415 1.415L8.586 10l-2.829 2.828a1 1 0 0 0 1.415 1.415L10 11.414l2.828 2.829a1 1 0 0 0 1.415-1.415L11.414 10zM10 20C4.477 20 0 15.523 0 10S4.477 0 10 0s10 4.477 10 10-4.477 10-10 10z"
          /></svg
        >
      </div>
      <iframe title="wikipedia" src={wikiLink} />
    </div>
  {/if}
  <!-- <ul class="results">
    {#each stems as stem, idx (stem)}
      <li>{stem}</li>
    {/each}
  </ul> -->
</div>

<style>

  .wikiclose {
    position: absolute;
    right: 1.5rem;
    top: 1.5rem;
    z-index: 10;
    cursor: pointer;
  }
  .wikiframe {
    border: 1px solid rgb(213, 213, 213);
    box-shadow: 0 2px 10px rgb(113, 113, 113);
    z-index: 9;
    position: fixed;
    display: flex;
    flex-direction: column;
    top: 10%;
    left: 50%;
    transform: translate(-50%, 0);
    width: 90%;
    height: 70%;
    background-color: white;
  }

  .wikiframe iframe {
    border: none;
    width: 100%;
    height: 100%;
  }

  .search-box {
    width: 90%;
    margin: auto;
  }

  .gwt-check {
    text-align: left;
    margin: 1rem;
    display: block;
  }
  .gwt-check input {
    display: inline-block;
    vertical-align: middle;
    width: auto;
  }
  .gwt-check label {
    display: inline-block;
  }
  .results {
    scroll-snap-align: y proximity;
    text-align: center;
    min-height: 20rem;
    /* font-size: 10px; */
  }
</style>
