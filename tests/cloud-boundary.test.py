"""Hosted recognition permits only the configured browser origin and limits work."""
import http.client,sys,threading,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from service import Handler,ThreadingHTTPServer
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
if __name__=='__main__':unittest.main()
