## In Short

This is a POC for a scalable, simple and affordable full-text search.
Pre-computed ElasticSearch results are put on CDN and fetched on demand in client - without requiring an online search engine.
You can try it by searching Wikibook's Cookbook at the [bottom of this page](#search).

The code is [here](https://github.com/asafamr/PlasticSearched). If you need help, open an issue or just contact me: asaf.amrami at gmail.

- Illustration by [monkik](https://www.flaticon.com/authors/monkik)
- The code uses [fuzzysort](https://github.com/farzher/fuzzysort) for term matching

## Benefits:

- Fast: Globally fast when deployed to CDN
- Private: Index and queries remain private when served manually (w/ auth.)
- Easy to operate: Just serve static content
- Cheap: Only pay for storage and bandwidth
- Robust: Test during compilation and deploy for years - JavaScript is undegradable

## Use Cases:

- Jamstack blogs
- Technical documentations
- IoT / Embedded Web Interfaces
- You have a lot of traffic but SaaS Search is too expansive
