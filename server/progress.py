"""Recognition progress from observed Audiveris page/step log messages."""
import re
STEPS=('LOAD','BINARY','SCALE','GRID','HEADERS','STEM_SEEDS','BEAMS','LEDGERS','HEADS','STEMS','REDUCTION','CUE_BEAMS','TEXTS','MEASURES','CHORDS','CURVES','SYMBOLS','LINKS','RHYTHMS','PAGE')
LABELS={**dict.fromkeys(STEPS,'Reading notes and musical symbols…'),'LOAD':'Opening the page…','BINARY':'Preparing the page image…','SCALE':'Finding the staff spacing…','GRID':'Finding staves and parts…','HEADERS':'Reading clefs and key signatures…','TEXTS':'Reading lyrics and markings…','MEASURES':'Finding bars…','RHYTHMS':'Reading rhythms…','PAGE':'Finishing the page…'}
STEP=re.compile(r'\[([^\]]+)\].*StepMonitoring\s+\d+\s*\|\s*(\w+)\s*$')
SHEET=re.compile(r'#(\d+)$')
END=re.compile(r'\|\s*End of Stub#(\d+)\s*$')
class RecognitionProgress:
    def __init__(self,pages):
        self.pages=pages;self.levels=[0]*len(pages);self.buffer='';self.last=None
    def feed(self,text):
        lines=(self.buffer+text).split('\n');self.buffer=lines.pop();updates=[]
        for line in lines:
            step=STEP.search(line);end=END.search(line)
            if step and step[2] in STEPS:
                sheet=SHEET.search(step[1])
                # Audiveris omits the #1 suffix when the selected PDF has one page.
                if not sheet and len(self.pages)!=1:continue
                page=int(sheet[1]) if sheet else 1;level=STEPS.index(step[2]);message=LABELS[step[2]];engine_step=step[2]
            elif end:
                page=int(end[1]);level=len(STEPS);message='Page processed.';engine_step='COMPLETE'
            else:continue
            if not 1<=page<=len(self.pages) or level<self.levels[page-1]:continue
            self.levels[page-1]=level
            # Five percent is PDF preparation; the last five is export/validation.
            percent=5+90*sum(self.levels)//(len(self.pages)*len(STEPS))
            key=(percent,page,engine_step)
            if key==self.last:continue
            self.last=key;updates.append({'stage':'recognizing','percent':percent,'pageIndex':page,'pageCount':len(self.pages),'sourcePage':self.pages[page-1]+1,'message':message})
        return updates
