import math
import json
import urllib.parse
import shutil
import os
import re
from multiprocessing import Pool

from tqdm import tqdm  # pip3 install tqdm, requests
import requests  # pip3 install tqdm, requests

es = 'http://localhost:9200'
index = 'enwikibooks'

MAX_NUM_RESULTS_PER_TERM = 200
QUERY_BATCH_SIZE = 10
N_PROCS = 4


template = json.dumps({
    "size": MAX_NUM_RESULTS_PER_TERM,
    "_source": [
        "title"
    ],
    "query": {
        "function_score": {
            "query": {
                "bool": {
                    "should": [
                        {
                            "term": {
                                "text.stemmed": {
                                    "value": "$TERM$",
                                    "boost": 1
                                }
                            }
                        },
                        {
                            "term": {
                                "title.stemmed": {
                                    "value": "$TERM$",
                                    "boost": 5
                                }
                            }
                        }
                    ]
                }
            },
            "functions": [
                {
                    "script_score": {
                        "script": {
                            "source": "Math.log(1.15 + doc['popularity_score'].value)"
                        }
                    }
                }
            ],
            "boost_mode": "multiply"
        }
    },
    
})
# "highlight": {
#         "fields": {
#             "text.stemmed": {
#                 "type": "fvh",
#                 "number_of_fragments":1
#             },
#             "title.stemmed": {
#                 "type": "fvh",
#                 "number_of_fragments":1
#             }
#         }
#     }

def batch(iterable, n=1):
    current_batch = []
    for item in iterable:
        current_batch.append(item)
        if len(current_batch) == n:
            yield current_batch
            current_batch = []
    if current_batch:
        yield current_batch


def map_hit(hit, idx):
    highlights = []
    if False and idx < 20:
        for field in 'title', 'text':
            for text in hit['highlight'].get(f'{field}.stemmed', []):
                indices = [int(x[0]) for x in re.findall('&&([0-9]+)&&( |$)', text)]
                if not len(indices):
                    indices=[-1]
                text = re.sub('&&([0-9]+)&&( |$)', '\\2', text)
                highlights.append(
                    {'txt': text, 'f': field, 'from': indices[0], 'to': indices[-1]})
    return {'id': hit['_id'], "sc": hit['_score'],  'ti': re.sub('&&([0-9]+)&&( |$)', '\\2', hit['_source']['title']) } #"hl": highlights, removed highlights for now


def safename(s):
    return urllib.parse.quote(s, safe='')


def process_batch(vbatch):
    query = '\n'.join('{}\n'+template.replace('$TERM$', term)
                      for term in vbatch)+'\n'
    response = requests.post(f'{es}/{index}/_msearch', data=query,
                             headers={"Content-Type": "application/x-ndjson"})
    resps = json.loads(response.text)['responses']
    assert len(vbatch) == len(resps)
    for term, term_res in zip(vbatch, resps):
        hits = [map_hit(hit,idx) for idx,hit in enumerate(term_res['hits']['hits'])]
        if term_res['timed_out']:
            print(f'"{term}" query timed out')
        with open(f'precomp/{safename(term)}.json', 'w') as fout:
            json.dump(hits, fout)


if __name__ == '__main__':
    shutil.rmtree('precomp', ignore_errors=True)
    os.mkdir('precomp')
    with open('./vocab_stemmed_unique.txt') as fin:
        vocab = [x.strip() for x in fin.readlines()]
    if N_PROCS and N_PROCS > 1:
        pool = Pool(N_PROCS)
        for vbatch in tqdm(pool.imap_unordered(process_batch, batch(vocab, QUERY_BATCH_SIZE)), total=math.ceil(len(vocab)/QUERY_BATCH_SIZE)):
            pass
    else:
        for batch in tqdm(batch(vocab, QUERY_BATCH_SIZE)):
            process_batch(batch)
