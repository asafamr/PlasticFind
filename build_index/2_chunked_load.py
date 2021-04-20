import math
import json
import re
import gzip
from multiprocessing import Pool
from itertools import islice

from tqdm import tqdm  # pip3 install tqdm, requests
import requests  # pip3 install tqdm, requests

es = 'http://localhost:9200'
index = 'enwikibooks'

BATCH_NUM_LINES = 100
N_PROCS = 4
GZIPPED_WIKI_FILE = './enwikibooks-20210329-cirrussearch-content.json.gz'
LIMIT_LINES = 0


def batch(iterable, n=1):
    current_batch = []
    for item in iterable:
        current_batch.append(item)
        if len(current_batch) == n:
            yield current_batch
            current_batch = []
    if current_batch:
        yield current_batch


def add_token_number(s: str):
    count = -1

    def repl(match: re.Match):
        nonlocal count
        count += 1
        return f'&&{count}&& '
    return re.sub(' ', repl, s)


def transform_doc(wikidoc):
    if 'index' in wikidoc:
        return wikidoc
    # adds position for highlighting https://stackoverflow.com/questions/30820827/elasticsearch-location-of-fragments-in-a-document
    text = add_token_number(wikidoc['text'])
    title = add_token_number(wikidoc['title'])
    popularity_score = wikidoc.get('popularity_score', 1e-15)
    return dict(text=text, title=title, popularity_score=popularity_score)


def process_lines_batch(lines_batch):
    query = ''.join(json.dumps(x)+'\n' for x in lines_batch)
    response = requests.post(f'{es}/{index}/_bulk', data=query,
                             headers={"Content-Type": "application/x-ndjson"})
    assert json.loads(response.text)[
        'errors'] == False, 'there were errors in docs insert'

def linepairfilter(gen, namespace:str):
    for line1,line2 in batch(gen, 2):
        if namespace.encode('utf8') in line2 and json.loads(line2)['namespace_text'] == namespace:
            yield line1
            yield line2
            

def gen_batches():
    with gzip.open(GZIPPED_WIKI_FILE) as fin:
        lines_gen = linepairfilter(fin,'Cookbook')
        if LIMIT_LINES and LIMIT_LINES > 0:
            lines_gen = islice(fin, LIMIT_LINES)
        for lines_batch in batch(lines_gen, BATCH_NUM_LINES):
            yield [transform_doc(json.loads(line)) for line in lines_batch]


pool = Pool(N_PROCS)

for _ in tqdm(pool.imap_unordered(process_lines_batch, gen_batches())):
    pass

# for lines_batch in tqdm(gen_batches()):
#     process_lines_batch(lines_batch)
