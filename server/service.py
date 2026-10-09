"""Local score-processing service; serves the application and cancellable Audiveris jobs."""
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote
import hashlib, inspect, json, threading, uuid
from recognition import recognize, available
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'.runtime/jobs'
CACHE.mkdir(parents=True,exist_ok=True)
JOBS={};LOCK=threading.Lock();POOL=ThreadPoolExecutor(max_workers=1)
LIMIT=64*1024*1024

def worker(job,data,pages,key):
    directory=CACHE/key;directory.mkdir(exist_ok=True)
    try:
        if job['cancel'].is_set(): return
        result_file=directory/'score.json'
        if result_file.exists():
            score=json.loads(result_file.read_text())
        else:
            input_file=directory/'input.pdf';input_file.write_bytes(data)
            def progress(update):
                if job['cancel'].is_set(): raise RuntimeError('Recognition cancelled.')
                with LOCK: job.update(message=update['message'],status='running')
            kwargs={'progress':progress,'timeout':1800}
            if 'cancel_event' in inspect.signature(recognize).parameters:kwargs['cancel_event']=job['cancel']
            score=recognize(input_file,list(range(len(pages))),directory/'output',**kwargs)
            for event in score['events']:
                if event.get('page') is not None:event['page']=pages[event['page']]
            for measure in score['measures']:
                if measure.get('page') is not None:measure['page']=pages[measure['page']]
            score['staves']={str(pages[int(k)]):v for k,v in score['staves'].items()}
            score['recognition']['selectedPages']=pages
            result_file.write_text(json.dumps(score))
        with LOCK:
            if not job['cancel'].is_set():job.update(status='done',message='Ready for review.',score=score)
    except Exception as error:
        with LOCK:job.update(status='cancelled' if job['cancel'].is_set() else 'error',error=str(error),message=str(error))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def send_json(self,data,status=200):
        body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();
        if self.command!='HEAD':self.wfile.write(body)
    def do_GET(self):
        path=unquote(urlparse(self.path).path)
        if path=='/assets/app-config.json':
            config=json.loads((ROOT/'assets/app-config.json').read_text())
            config['recognitionAvailable']=available()
            if (ROOT/'assets/united-in-purpose.pdf').is_file() and (ROOT/'assets/recognized-sample.json').is_file():
                config['sample']={'id':'united-in-purpose','title':'United in Purpose','subtitle':'Rollo Dilworth · SATB & piano','pdf':'./assets/united-in-purpose.pdf','score':'./assets/recognized-sample.json','description':'Private testing score · 15 pages','cover':'UNITED\nIN PURPOSE'}
            return self.send_json(config)
        if path=='/api/health':return self.send_json({'recognition':available(),'maxUploadBytes':LIMIT})
        if path.startswith('/api/jobs/'):
            with LOCK:
                job=JOBS.get(path.rsplit('/',1)[-1]);data={k:v for k,v in job.items() if k!='cancel'} if job else None
            return self.send_json(data or {'error':'Job not found.'},200 if data else 404)
        if any(segment.startswith('.') for segment in path.split('/')) or path.startswith(('/server/','/tests/','/docs/')):
            return self.send_error(404)
        if self.command=='HEAD':super().do_HEAD()
        else:super().do_GET()
    def do_HEAD(self):self.do_GET()
    def do_POST(self):
        parsed=urlparse(self.path)
        if parsed.path!='/api/jobs':return self.send_json({'error':'Unknown endpoint.'},404)
        if not available():return self.send_json({'error':'Recognition engine unavailable. Run the documented local setup.'},503)
        try:
            if self.headers.get('Content-Type','').split(';')[0]!='application/pdf':raise ValueError('Upload a PDF.')
            length=int(self.headers.get('Content-Length',0))
            if length<=0 or length>LIMIT:return self.send_json({'error':'PDF upload must be under 64 MB.'},413)
            pages=[int(p) for p in parse_qs(parsed.query).get('pages',[''])[0].split(',')]
            if not pages or pages!=sorted(set(pages)) or min(pages)<0 or max(pages)>10000 or len(pages)>100:raise ValueError('Select valid pages in their original order.')
            data=self.rfile.read(length)
            if not data.startswith(b'%PDF-'):raise ValueError('This is not a readable PDF.')
            from pypdf import PdfReader
            import io
            reader=PdfReader(io.BytesIO(data))
            if reader.is_encrypted:raise ValueError('Password-protected PDFs are not supported.')
            if len(reader.pages)!=len(pages):raise ValueError('Submitted PDF must contain only the selected pages.')
            key=hashlib.sha256(data+json.dumps(pages).encode()+b'Audiveris-5.11-provider-v2').hexdigest()
            job={'id':uuid.uuid4().hex,'status':'queued','message':'Waiting to process selected pages.','cancel':threading.Event()}
            with LOCK:JOBS[job['id']]=job
            POOL.submit(worker,job,data,pages,key)
            return self.send_json({'id':job['id']},202)
        except (ValueError,ImportError) as error:return self.send_json({'error':str(error)},400)
        except Exception:return self.send_json({'error':'Could not read this PDF.'},400)
    def do_DELETE(self):
        with LOCK:
            job=JOBS.get(urlparse(self.path).path.rsplit('/',1)[-1])
            if job:job['cancel'].set();job.update(status='cancelled',message='Recognition cancelled.')
        self.send_json({'cancelled':bool(job)},200 if job else 404)

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=5173);p.add_argument('--cert');p.add_argument('--key');args=p.parse_args()
    server=ThreadingHTTPServer(('0.0.0.0',args.port),Handler)
    if args.cert:
        import ssl
        context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.minimum_version=ssl.TLSVersion.TLSv1_2;context.load_cert_chain(args.cert,args.key)
        server.socket=context.wrap_socket(server.socket,server_side=True)
    print(f'Sight: {"https" if args.cert else "http"}://localhost:{args.port}',flush=True)
    server.serve_forever()
