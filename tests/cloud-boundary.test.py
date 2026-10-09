"""Hosted recognition permits only the configured browser origin and limits work."""
import http.client,sys,threading,unittest,io,json
from unittest.mock import patch
from pypdf import PdfWriter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from service import Handler,ThreadingHTTPServer
import service
class HostedBoundary(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=cls.server.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
 def request(self,method,origin):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
  try:c.request(method,'/api/jobs?pages=0',headers={'Origin':origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'});r=c.getresponse();return r.status,dict(r.getheaders()),r.read()
  finally:c.close()
 def test_pages_origin_preflight_is_allowed(self):
  status,headers,_=self.request('OPTIONS','https://verywaterrrr.github.io');self.assertEqual(status,204);self.assertEqual(headers.get('Access-Control-Allow-Origin'),'https://verywaterrrr.github.io')
 def test_unapproved_origin_is_denied(self):
  status,headers,_=self.request('OPTIONS','https://unapproved.example');self.assertEqual(status,403);self.assertNotIn('Access-Control-Allow-Origin',headers)
 def test_cancelled_queued_uploads_keep_capacity_until_drained(self):
  writer=PdfWriter();writer.add_blank_page(width=300,height=400);buffer=io.BytesIO();writer.write(buffer)
  tasks=[]
  def submit(function,*args):tasks.append((function,args))
  def request(method,path,body=None):
   c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
   try:
    c.request(method,path,body,{'Content-Type':'application/pdf'});r=c.getresponse();return r.status,json.loads(r.read())
   finally:c.close()
  with patch.object(service.POOL,'submit',side_effect=submit),patch.object(service,'available',return_value=True):
   try:
    for _ in range(service.MAX_JOBS):
     status,job=request('POST','/api/jobs?pages=0',buffer.getvalue());self.assertEqual(status,202)
     self.assertEqual(request('DELETE','/api/jobs/'+job['id'])[0],200)
    # No body is needed: a full queue must reject before reading/parsing it.
    self.assertEqual(request('POST','/api/jobs?pages=0')[0],429)
    function,args=tasks.pop(0);function(*args)
    status,job=request('POST','/api/jobs?pages=0',buffer.getvalue());self.assertEqual(status,202)
    request('DELETE','/api/jobs/'+job['id'])
   finally:
    for function,args in tasks:
     args[0]['cancel'].set();function(*args)
    service.JOBS.clear()
if __name__=='__main__':unittest.main()
