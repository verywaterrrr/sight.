"""Original SATB/piano exercise and matching note geometry; no recognition claims.

Regenerate with: pip install reportlab fonttools; python scripts/create-demo.py
Bravura symbol outlines: Steinberg, SIL Open Font License (fonts/OFL.txt).
"""
from pathlib import Path
import json
from reportlab.pdfgen import canvas
from fontTools.ttLib import TTFont
from fontTools.pens.reportLabPen import ReportLabPen
from fontTools.pens.boundsPen import BoundsPen
ROOT=Path(__file__).resolve().parents[1]
font=TTFont(Path(__file__).parent/'fonts/Bravura.otf');glyphs=font.getGlyphSet();cmap=font.getBestCmap()
W,H=595,842;GAP=7;SCALE=GAP/250
c=canvas.Canvas(str(ROOT/'assets/morning-practice.pdf'),pagesize=(W,H),invariant=1)
c.setTitle('Morning Practice — original Sight exercise');c.setAuthor('Sight')
parts=[{'id':f'P{i+1}','name':n} for i,n in enumerate(['Soprano','Alto','Tenor','Bass','Piano'])]
score={'parts':parts,'events':[],'measures':[],'staves':{},'duration':64,'warnings':[],'demo':True,'recognition':{'engine':'Original authored exercise','sampleRevision':1,'reviewRequired':False}}
def symbol(code,x,y,center=False):
 glyph=glyphs[cmap[code]];bounds=BoundsPen(glyphs);glyph.draw(bounds);b=bounds.bounds
 c.saveState();c.translate(x,y)
 if center:c.translate(-(b[0]+b[2])*SCALE/2,-(b[1]+b[3])*SCALE/2)
 c.scale(SCALE,SCALE);p=c.beginPath();p.closePath=p.close;glyph.draw(ReportLabPen(glyphs,p));c.drawPath(p,stroke=0,fill=1);c.restoreState()
 return (b[2]-b[0])*SCALE
# All pitches are naturals in C major. Separate tenor octave clef maps printed E4 to sung E3.
def diatonic(midi):
 pc=midi%12;step={0:0,2:1,4:2,5:3,7:4,9:5,11:6}[pc];return (midi//12-1)*7+step
melody=[60,62,64,67,65,64,62,60,64,65,67,69,67,65,64,62]
for page in range(4):
 c.setFillColorRGB(.12,.14,.12);c.setFont('Times-Bold',23);c.drawCentredString(W/2,790,'Morning Practice')
 c.setFont('Helvetica',9);c.drawCentredString(W/2,771,'An original sight-singing exercise  |  C major  |  SATB & piano')
 c.setFont('Helvetica',8);c.drawString(60,746,'Calm and clear  -  quarter note = 80');c.drawRightString(550,746,f'Page {page+1} / 4')
 staves=[]
 for system in range(2):
  top=700-system*330;bottoms=[top-i*48 for i in range(6)]
  c.setLineWidth(.65);c.line(122,bottoms[-1],122,bottoms[0]+28)
  for staff,bottom in enumerate(bottoms):
   part=f'P{min(staff,4)+1}';c.setFont('Helvetica',8);c.drawRightString(108,bottom+12,['Soprano','Alto','Tenor','Bass','Piano',''][staff])
   for line in range(5):c.line(122,bottom+line*GAP,550,bottom+line*GAP)
   bass=staff in (3,5);symbol(0xE062 if bass else 0xE050,130,bottom+(3 if bass else 1)*GAP)
   if staff==2:c.setFont('Helvetica',6);c.drawCentredString(139,bottom-8,'8')
   c.setFont('Times-Bold',13);c.drawString(154,bottom+15,'4');c.drawString(154,bottom+1,'4')
   staves.append({'part':part,'short':part,'x':122/W,'y':1-(bottom+14)/H,'system':system,'staff':str(2 if staff==5 else 1)})
  for bar_index in range(2):
   measure=page*4+system*2+bar_index+1;left=170+bar_index*190
   score['measures'].append({'number':measure,'start':(measure-1)*4,'duration':4,'page':page,'timeSig':{'num':4,'den':4}})
   c.setFont('Helvetica',7);c.drawString(left,bottoms[0]+38,str(measure))
   for staff,bottom in enumerate(bottoms):
    part=f'P{min(staff,4)+1}';bass=staff in (3,5);reference=diatonic(43 if bass else 64)
    pattern=[(0,1),(1,1),(2,1),(3,1)] if measure%4!=0 else [(0,2),(2,2)]
    if measure==16:pattern=[(0,4)]
    for onset,duration in pattern:
     base=melody[(measure-1+int(onset))%len(melody)]
     midi=base+[12,0,-12,-24,0,-24][staff]
     if staff==1:midi=melody[(measure+int(onset)+2)%len(melody)]
     printed=midi+(12 if staff==2 else 0);y=bottom+(diatonic(printed)-reference)*GAP/2;x=left+15+onset*43
     # Ledger lines are drawn through their proper staff positions.
     for offset in range(-2,diatonic(printed)-reference-1,-2):c.line(x-7,bottom+offset*GAP/2,x+7,bottom+offset*GAP/2)
     for offset in range(10,diatonic(printed)-reference+1,2):c.line(x-7,bottom+offset*GAP/2,x+7,bottom+offset*GAP/2)
     width=symbol(0xE0A2 if duration==4 else 0xE0A3 if duration==2 else 0xE0A4,x,y,True)
     if duration<4:
      down=y>bottom+14;stemx=x-width/2+.3 if down else x+width/2-.3;c.setLineWidth(.75);c.line(stemx,y,stemx,y+(-22 if down else 22))
     score['events'].append({'id':f'demo-{measure}-{staff}-{onset}','part':part,'midi':midi,'measure':measure,'sourceMeasure':str(measure),'beat':onset,'duration':duration,'time':(measure-1)*4+onset,'page':page,'x':x/W,'y':1-y/H,'voice':str(2 if staff==5 else 1),'staff':str(2 if staff==5 else 1),'tieStart':False,'tieStop':False,'uncertain':False})
   for bottom in bottoms:c.setLineWidth(.75);c.line(left+190,bottom,left+190,bottom+28)
  if page==3 and system==1:
   for bottom in bottoms:c.setLineWidth(2);c.line(550,bottom,550,bottom+28)
 score['staves'][str(page)]=staves
 c.setFont('Helvetica',7);c.drawCentredString(W/2,28,'Original music and score layout created for Sight. Not derived from a supplied choir score.')
 c.showPage()
c.save();(ROOT/'assets/morning-practice.json').write_text(json.dumps(score,separators=(',',':'))+'\n')
print(f'Created four-page original demo, {len(score["events"])} events.')
