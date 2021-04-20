export es=localhost:9200
export site=en.wikipedia.org
export index=enwikibooks

curl -XDELETE $es/$index?pretty

cat schema.json |
  curl -H 'Content-Type: application/json' -XPUT $es/$index?pretty\&include_type_name=true -d @-

cat mapping.json |
  curl -H 'Content-Type: application/json' -XPUT $es/$index/_mapping/page?pretty\&include_type_name=true -d @-