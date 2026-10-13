import sys,unittest,threading,urllib.request
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from service import Handler,ThreadingHTTPServer,ASSET_VERSION
class Assets(unittest.TestCase):
 def test_release_html_and_imports_revalidate_and_bypass_old_urls(self):
  class Quiet(Handler):
   def log_message(self,*args):pass
  server=ThreadingHTTPServer(('127.0.0.1',0),Quiet);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   base=f'http://127.0.0.1:{server.server_port}'
   for path,reference in [('/','app.js'),('/app.js','./state.js'),('/audio.js','./instruments.js')]:
    request=urllib.request.Request(base+path,headers={'If-Modified-Since':'Wed, 01 Jan 2031 00:00:00 GMT'})
    with urllib.request.urlopen(request) as response:
     self.assertEqual(response.status,200);self.assertEqual(response.headers['Cache-Control'],'no-cache');self.assertIn(reference+'?v='+ASSET_VERSION,response.read().decode())
  finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__':unittest.main()
