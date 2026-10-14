import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import recognition
class RecognitionProgress(unittest.TestCase):
 def tracker(self):
  cls=getattr(recognition,'RecognitionProgress',None);self.assertIsNotNone(cls,'recognition must report observed page/step progress');return cls([0,11])
 def step(self,page,stage):return f'INFO [selected-pages#{page}] StepMonitoring 98 | {stage}\n'
 def test_completed_work_advances_and_uses_original_pdf_page(self):
  t=self.tracker();self.assertEqual(t.feed(self.step(1,'LOAD'))[-1]['percent'],5)
  self.assertEqual(t.feed(self.step(1,'GRID'))[-1]['percent'],11)
  first=t.feed('INFO [selected-pages#1] Book 2050 | End of Stub#1\n')[-1];self.assertEqual(first['percent'],50)
  second=t.feed(self.step(2,'BINARY'))[-1];self.assertEqual(second['sourcePage'],12);self.assertEqual(second['pageIndex'],2);self.assertEqual(second['pageCount'],2);self.assertEqual(second['percent'],52)
 def test_partial_duplicate_unknown_and_out_of_order_lines_are_safe(self):
  t=self.tracker();line=self.step(1,'HEADS');self.assertEqual(t.feed(line[:22]),[]);result=t.feed(line[22:]);self.assertEqual(result[-1]['percent'],23)
  self.assertEqual(t.feed(line),[]);self.assertEqual(t.feed(self.step(1,'LOAD')),[]);self.assertEqual(t.feed(self.step(5,'PAGE')),[]);self.assertEqual(t.feed(self.step(1,'UNKNOWN')),[])
 def test_recognition_never_claims_finished_before_export(self):
  t=self.tracker();t.feed('INFO Book 2050 | End of Stub#1\n');end=t.feed('INFO Book 2050 | End of Stub#2\n')[-1];self.assertEqual(end['percent'],95)
 def test_single_page_logs_without_sheet_suffix_advance(self):
  line='INFO [selected-pages] StepMonitoring 98 | HEADS\n'
  result=recognition.RecognitionProgress([11]).feed(line)
  self.assertEqual(len(result),1);self.assertEqual(result[0]['percent'],41);self.assertEqual(result[0]['sourcePage'],12)
  self.assertEqual(self.tracker().feed(line),[])

class WorkerProgress(unittest.TestCase):
 def test_api_preserves_progress_and_original_page_mapping(self):
  import tempfile,threading
  from unittest.mock import patch
  import service
  job={'id':'progress-test','cancel':threading.Event()};observed=[]
  def recognize(pdf,pages,output,progress,timeout,cancel_event):
   progress({'message':'Reading rhythms…','stage':'recognizing','percent':52,'pageIndex':2,'pageCount':2,'sourcePage':2});observed.append(dict(job));return {'events':[],'measures':[],'staves':{},'recognition':{}}
  slots=threading.BoundedSemaphore(1);slots.acquire()
  with tempfile.TemporaryDirectory() as folder,patch.object(service,'CACHE',Path(folder)),patch.object(service,'SLOTS',slots),patch.object(service,'recognize',recognize):service.worker(job,b'pdf',[0,11],'test')
  self.assertEqual(observed[0]['percent'],52);self.assertEqual(observed[0]['sourcePage'],12);self.assertEqual(observed[0]['pageIndex'],2);self.assertEqual(job['status'],'done');self.assertEqual(job['percent'],100)
 def test_cancelled_queued_jobs_are_not_reset_to_running(self):
  import tempfile,threading
  from unittest.mock import patch
  import service
  cancel=threading.Event();cancel.set();job={'status':'cancelled','cancel':cancel};slots=threading.BoundedSemaphore(1);slots.acquire()
  with tempfile.TemporaryDirectory() as folder,patch.object(service,'CACHE',Path(folder)),patch.object(service,'SLOTS',slots):service.worker(job,b'pdf',[0],'test')
  self.assertEqual(job['status'],'cancelled');self.assertTrue(slots.acquire(blocking=False))

if __name__=='__main__':unittest.main()
