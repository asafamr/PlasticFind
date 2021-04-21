## In Short

This is a POC for a scalable, simple and affordable full-text search.
Pre-computed ElasticSearch results are put on CDN and fetched on demand in client - without requiring an online search engine.
You can try it by searching Wikibook's Cookbook at the [bottom of this page](#search).

The client also does prefix and fuzzy matching into (subsets of) the vocabulary (with [fuzzysort](https://github.com/farzher/fuzzysort)), Porter stemming ([porter-stemmer](https://github.com/jedp/porter-stemmer)), UAX#29 tokenization ([unicode-default-word-boundary](https://github.com/eddieantonio/unicode-default-word-boundary)) and some fetch retry logic ([axios](https://github.com/axios/axios), [axios-retry](https://github.com/softonic/axios-retry)).
Code is [here](https://github.com/asafamr/PlasticSearched). Preprocessing is in Python and frontend in [Svelte](https://svelte.dev/).
If you need any help with it, feel free to open an issue or just contact me: asaf.amrami at gmail.

Plastic bottles illustration by [monkik](https://www.flaticon.com/authors/monkik)

## Benefits:

- Fast: Globally fast when deployed to CDN
- Private: Index and queries remain private when served manually (w/ auth.)
- Easy to operate: Just serve static content
- Cheap: Only pay for storage and bandwidth
- Robust: Test during compilation and deploy for years - [JavaScript is undegradable](https://death-to-ie11.com/)

## Use Cases:

- Jamstack blogs
- Technical documentations
- IoT / embedded web interfaces
- You have a lot of traffic but SaaS search is too expansive
