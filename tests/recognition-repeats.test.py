import sys,tempfile,zipfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from recognition import parse_result
class RepeatImport(unittest.TestCase):
 def test_repeat_metadata_and_printed_repeat_dots_are_retained(self):
  with tempfile.TemporaryDirectory() as d:
   mxl=Path(d)/'score.mxl';omr=Path(d)/'score.omr'
   with zipfile.ZipFile(mxl,'w') as z:
    z.writestr('META-INF/container.xml','<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>')
    z.writestr('score.xml','<score-partwise><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><barline location="left"><repeat direction="forward"/></barline></measure><measure number="2"><barline location="right"><repeat direction="backward" times="3"/></barline></measure></part></score-partwise>')
   with zipfile.ZipFile(omr,'w') as z:
    z.writestr('book.xml','<book><sheet number="1"/></book>')
    z.writestr('sheet#1/sheet#1.xml','<sheet><picture width="1000" height="1000"/><page><system><part id="1"><measure/><measure/></part><stack left="100" right="500" duration="1"/><stack left="500" right="900" duration="1"/><sig><inters><repeat-dot staff="1" id="d"><bounds x="880" y="400" w="8" h="8"/></repeat-dot></inters></sig></system></page></sheet>')
   s=parse_result(mxl,omr);self.assertEqual(s.get('repeats',[{}])[0].get('times'),3);self.assertEqual(s['repeats'][0]['startMeasure'],1);self.assertEqual(s['repeats'][0]['endMeasure'],2);self.assertGreater(len(s.get('repeatMarks',[])),0)
if __name__=='__main__':unittest.main()
