import json
import shutil
import os
from itertools import groupby
import urllib.parse

shutil.rmtree('fuzzy', ignore_errors=True)
os.mkdir('fuzzy')

with open('./vocab.txt') as fin:
    vocab = sorted([x.strip() for x in fin.readlines()])
groupedby_prefix = dict((k, list(v))
                        for k, v in groupby(vocab, key=lambda x: x[:2]))

for prefix in sorted(groupedby_prefix.keys()):
    if len(prefix) == 2:
        with open(f'fuzzy/{urllib.parse.quote_plus(prefix)}.json', 'w') as fout:
            json.dump(sorted(groupedby_prefix[prefix]), fout)
