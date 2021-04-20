
## In Short 
Pre-computed ElasticSearch results are put on CDN and joined in client - without backend. You can try it by searching Wikibook's Cookbook at the bottom of this page.

Code is [here](https://github.com/asafamr/PlasticSearched), Feel free to use it as you would like. If you need help, open an issue or just  contact me: asaf.amrami at gmail

* Illustration by [monkik](https://www.flaticon.com/authors/monkik)
* The code uses [fuzzysort](https://github.com/farzher/fuzzysort) for term matching.

## Benefits:
* Fast: Globally fast when deployed to CDN
* Private: Index and queries remain private when served manually (w/ auth.)
* Easy to operate: Just serve static content
* Cheap: Only pay for storage and bandwidth
* Robust: test during compilation and deploy for years. JavaScript is undegradable.

## Use Cases:
* JAMStack blogs
* Technical Documentations
* IoT / Embedded Web Interfaces
* You have a lot of traffic but SaaS Search is too expansive 