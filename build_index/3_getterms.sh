export es=localhost:9200
export index=enwikibooks

curl -H 'Content-Type: application/json' -XPUT $es/_cluster/settings -d'
    {
  "persistent": { 
    "search.max_buckets": 200000
  }
}'

curl -H 'Content-Type: application/json' -XGET $es/$index/_search -d'
    {
  "size": 0,
  "aggs": {
    "terms_body": {
      "terms": { "field": "text", "size": 1000 }
    }
  }
}' |  jq '[.aggregations[].buckets[].key | select(test("^[a-zA-Z]{2}")) ] |sort'  > vocab_frequent.json

curl -H 'Content-Type: application/json' -XGET $es/$index/_search -d'
    {
  "size": 0,
  "aggs": {
    "terms_title": {
      "terms": { "field": "title", "size": 150000 }
    },
    "terms_body": {
      "terms": { "field": "text", "size": 150000 }
    }
  }
}' |  jq -r '.aggregations[].buckets[] | "\(.key)"' | grep -P '^[[:ascii:]]+$' | sort -u > vocab.txt # -r \(.doc_count)"


cat vocab.txt | \
  jq --raw-input --slurp 'split("\n") | map(select(. != "")) | {analyzer:"stemmed",text:.}' | \
  curl -H 'Content-Type: application/json' -XGET $es/$index/_analyze -d @- | \
  jq -r '.tokens[].token'  | \
  sort -u > vocab_stemmed_unique.txt
