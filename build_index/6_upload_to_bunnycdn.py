
import os
from os.path import isfile, join
from tqdm import tqdm
from urllib import parse
import hashlib
from multiprocessing.pool import ThreadPool
from .BunnyCDN import CDNConnector

from dotenv import load_dotenv
load_dotenv()  # take environment variables from .env.

def getChecksum(filepath):
    with open(filepath, 'rb') as f:
        sha256 = hashlib.sha256()

        while True:
            chunk = f.read(16 * 1024)
            if not chunk:
                break
            sha256.update(chunk)

    return sha256.hexdigest().upper()

cdn_connector = CDNConnector(os.environ['BUNNY_FTP_PASS'],os.environ['BUNNY_FTP_USER'])  

def upload(args):
    filesrc,targetdir,targetname = args
    cdn_connector.upload_file(targetdir,targetname,filesrc)


def syncdir(localdir, targetdir):
    if targetdir[-1]!='/':
        targetdir=targetdir+'/'

    localfiles = dict((f,getChecksum(join(localdir, f))) for f in os.listdir(localdir) if isfile(join(localdir, f)))
    targetfiles = dict((x['ObjectName'], x['Checksum']) for x in cdn_connector.get_storaged_objects(targetdir))
    
    to_del = [x for x in targetfiles if localfiles.get(x)!=targetfiles.get(x)]
    if to_del:
        print(f'removing {len(to_del)} files from {targetdir}')
        with ThreadPool(16) as pp:
            for _ in tqdm(pp.imap_unordered(cdn_connector.remove, [ f'{targetdir}{f}' for f in to_del]),total=len(to_del)):
                pass
    
    to_upload = [x for x in localfiles if localfiles.get(x)!=targetfiles.get(x)]
    if to_upload:
        print(f'uploading {len(to_upload)} files from {targetdir}')
        with ThreadPool(64) as pp:
            for _ in tqdm(pp.imap_unordered(upload, [ [join(localdir, f), targetdir,  f] for f in to_upload]),total=len(to_upload)):
                pass
    print(f'local dir {localdir} and remote dir {targetdir} are in sync.')
    
       
syncdir('precomp/','search/')
syncdir('fuzzy/','fuzzy/')
upload(['vocab_frequent.json','/','vocab_frequent.json'])