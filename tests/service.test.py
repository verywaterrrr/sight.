"""Exercise the real HTTP boundary without running recognition for malformed input."""
import http.client,io,sys,threading,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
from service import Handler,ThreadingHTTPServer
from pypdf import PdfWriter
class ServiceBoundary(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
  threading.Thread(target=cls.server.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
 def request(self,method,path,body=None,headers=None):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
  try:c.request(method,path,body,headers or {});r=c.getresponse();return r.status,r.read()
  finally:c.close()
 def test_runtime_is_not_exposed_by_get_or_head(self):
  for method in ['GET','HEAD']:
   for path in ['/.runtime/tessdata/eng.traineddata','/%2Eruntime/tessdata/eng.traineddata','/server/service.py']:
    self.assertEqual(self.request(method,path)[0],404,(method,path))
 def test_invalid_pdf_and_page_count_are_rejected(self):
  self.assertEqual(self.request('POST','/api/jobs?pages=0',b'bad',{'Content-Type':'application/pdf'})[0],400)
  w=PdfWriter();w.add_blank_page(width=300,height=400);buffer=io.BytesIO();w.write(buffer)
  self.assertEqual(self.request('POST','/api/jobs?pages=0,1',buffer.getvalue(),{'Content-Type':'application/pdf'})[0],400)
 def test_large_request_is_rejected_before_reading_body(self):
  self.assertEqual(self.request('POST','/api/jobs?pages=0',headers={'Content-Type':'application/pdf','Content-Length':str(64*1024*1024+1)})[0],413)
if __name__=='__main__':unittest.main()
