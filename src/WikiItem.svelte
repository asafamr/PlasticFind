<script lang="ts">
  import { onDestroy } from "svelte";
  import { createEventDispatcher } from 'svelte';
  import axios from "axios";
  import { stem } from "./lib/nlp/stem";
  import { tokenizeSpans } from "./lib/nlp/tokenize";

  export let title: string;
  export let docId: string;
  export let getText: boolean;

  export let highlightTerms: string[] = [];

  const canceledMessage = "$OP_CANCELED";

  const cancelTokenSource = axios.CancelToken.source();


	const dispatch = createEventDispatcher();

  $: contentPromise = !getText
    ? Promise.resolve("")
    : axios
        .get(
          "https://en.wikibooks.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&origin=*&redirects=1&pageids=" +
            docId,
          {
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            cancelToken: cancelTokenSource.token,
          }
        )
        .then((res) => {
          const pages = res?.data?.query?.pages;
          if (pages && Object.values(pages).length) {
            const extract = (Object.values(pages)[0] as any)?.extract;
            return extract.replace(/^\s*Cookbook[^\n]*/, "").trim();
          }
          return "";
        })
        .catch((err) => {
          if (err?.message === canceledMessage) {
            return;
          }
          throw err;
        });

  function doHighlight(txt: string) {
    const tokenized = [...tokenizeSpans(txt)];
    return tokenized
      .map((x) =>
        highlightTerms.includes(stem(x.text)) ? `<b>${x.text}</b>` : x.text
      )
      .join("");
  }

  onDestroy(() => cancelTokenSource.cancel(canceledMessage));
</script>

<div class="item" on:click={()=>dispatch('click')}>
  <div class="title">{@html doHighlight(title)}</div>
  <div class="info">
    {#await contentPromise}
      <div class="lds-ellipsis">
        <div />
        <div />
        <div />
        <div />
      </div>
    {:then res}
      {@html res ? doHighlight(res) : ""}
    {/await}
  </div>
</div>

<style>
 
  .item {
    padding-top: 1rem;
    border-bottom: 1px solid #959595;
    cursor: pointer;
  }
  .item:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
  .title {
    font-size: 1.4rem;
  }
  .info {
    max-height: 3rem;

    line-height: 1.5rem;
    position: relative;
    /* white-space: normal; */
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .lds-ellipsis {
    display: inline-block;
    position: relative;
    width: 80px;
    height: 80px;
  }
  .lds-ellipsis div {
    position: absolute;
    top: 14px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.158);
    animation-timing-function: cubic-bezier(0, 1, 1, 0);
  }
  .lds-ellipsis div:nth-child(1) {
    left: 8px;
    animation: lds-ellipsis1 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(2) {
    left: 8px;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(3) {
    left: 32px;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(4) {
    left: 56px;
    animation: lds-ellipsis3 0.6s infinite;
  }
  @keyframes lds-ellipsis1 {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes lds-ellipsis3 {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(0);
    }
  }
  @keyframes lds-ellipsis2 {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(24px, 0);
    }
  }
</style>
