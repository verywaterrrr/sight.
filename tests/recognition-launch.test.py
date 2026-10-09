"""Batch recognition must not leave macOS AWT alive after exporting."""
import os,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
import recognition
from pypdf import PdfWriter
class LaunchEnvironment(unittest.TestCase):
 def test_batch_child_is_headless_and_keeps_existing_java_options(self):
  class Captured(Exception):pass
  def capture(*args,**kwargs):
   options=kwargs['env'].get('JAVA_TOOL_OPTIONS','')
   self.assertIn('-Xmx2g',options)
   self.assertTrue(options.endswith('-Djava.awt.headless=true'),options)
   raise Captured()
  with tempfile.TemporaryDirectory() as folder:
   pdf=Path(folder)/'one.pdf';w=PdfWriter();w.add_blank_page(width=300,height=400);w.write(pdf)
   with patch.dict(os.environ,{'JAVA_TOOL_OPTIONS':'-Xmx2g'}),patch.object(recognition.subprocess,'Popen',side_effect=capture):
    with self.assertRaises(Captured):recognition.recognize(pdf,[0],Path(folder)/'out')
if __name__=='__main__':unittest.main()
