<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";

  export let getCompletions: (s: string) => Promise<string[]>;

  let autocompInvis = "";
  let autocompSugg = "";
  let autocompFull = "";
  let showAutcomp = false;

  let queryBox: HTMLDivElement;

  const contentEditableSupport = "contentEditable" in document.documentElement;

  const dispatch = createEventDispatcher();

  function isCaretAtEndOfQueryBox() {
    const selection = window.getSelection();
    if (
      selection &&
      selection?.focusNode?.parentElement === queryBox &&
      selection.rangeCount === 1
    ) {
      const rng = selection.getRangeAt(0);
      let pre_range = document.createRange();
      pre_range.selectNodeContents(queryBox);
      pre_range.setEnd(rng.startContainer, rng.startOffset);
      const beforeCaret = pre_range.cloneContents().textContent;
      return queryBox.textContent === beforeCaret;
    }

    return false;
  }

  const inputChanged: svelte.JSX.FormEventHandler<
    HTMLDivElement | HTMLInputElement
  > = (params) => {
    showAutcomp = false;
    autocompInvis = "";
    if (params.currentTarget instanceof HTMLInputElement) {
      dispatch("input", params.currentTarget.value);
      return;
    }
    const query = queryBox.textContent;
    dispatch("input", query.trim());

    if (
      isCaretAtEndOfQueryBox() &&
      query.trim() &&
      !/^\s+$/.test(query.slice(-1))
    ) {
      //TODO unicode
      const prefix = query.split(" ").slice(-1);
      if (prefix && prefix[0]) {
        getCompletions(prefix[0]).then((sugs) => {
          if (sugs && sugs.length) {
            showAutcomp = true;
            autocompInvis = query;
            autocompSugg = sugs[0].slice(prefix[0].length);
            autocompFull = sugs[0];
          }
        });
      }
    }
  };

  const keydown: svelte.JSX.KeyboardEventHandler<HTMLDivElement> = async (
    e
  ) => {
    if (e.key === "ArrowRight" && autocompSugg) {
      const sel = window?.getSelection();
      const rng = window?.getSelection()?.getRangeAt(0);
      if (rng && sel.anchorNode.parentElement === queryBox) {
        const newContent = [
          ...queryBox.textContent.split(" ").slice(0, -1),
          autocompFull,
        ];
        queryBox.textContent = newContent.join(" ");
        autocompSugg = "";
        await tick();

        // https://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity/3866442#3866442
        const range = document.createRange(); //Create a range (a range is a like the selection but invisible)
        range.selectNodeContents(queryBox); //Select the entire contents of the element with the range
        range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
        const selection = window.getSelection(); //get the selection object (allows you to change selection)
        selection.removeAllRanges(); //remove any selections already made
        selection.addRange(range); //make the range you have just created the visible selection
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };
</script>

<div class="outer">
  {#if contentEditableSupport}
    {#if showAutcomp}
      <div class="autocomp inputlike">
        <span class="invis">{autocompInvis}</span><span class="gray"
          >{autocompSugg}</span
        >
      </div>
    {/if}

    <div
      contenteditable="true"
      class="inputlike"
      spellcheck="true"
      bind:this={queryBox}
      on:input={inputChanged}
      on:keydown={keydown}
    />
  {:else}
    <input on:input={inputChanged} spellcheck="true" />
  {/if}
</div>

<style>
  input {
    width: 100%;
  }
  .outer {
    width: 100%;
    height: 100%;
    position: relative;
    padding: 0;
    margin: 0;
    display: block;
  }
  .autocomp {
    position: absolute;
    pointer-events: none;
    visibility: hidden;
  }
  .autocomp .invis {
    opacity: 0;
    margin-left: 1px;
  }
  .autocomp .gray {
    opacity: 0.4;
    visibility: visible;
  }

  .inputlike {
    background-color: #ffffff;
    border: 1px solid #cccccc;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
    -webkit-transition: border linear 0.2s, box-shadow linear 0.2s;
    -moz-transition: border linear 0.2s, box-shadow linear 0.2s;
    -ms-transition: border linear 0.2s, box-shadow linear 0.2s;
    -o-transition: border linear 0.2s, box-shadow linear 0.2s;
    transition: border linear 0.2s, box-shadow linear 0.2s;
    padding: 0.5rem;
    text-align: left;
  }

  .inputlike:focus {
    border-color: rgba(82, 168, 236, 0.8);
    outline: 0;
    outline: thin dotted \9;

    -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
      0 0 8px rgba(82, 168, 236, 0.6);
    -moz-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
      0 0 8px rgba(82, 168, 236, 0.6);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
      0 0 8px rgba(82, 168, 236, 0.6);
  }
</style>
