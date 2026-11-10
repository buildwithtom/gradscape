"""One-time, allowlist-only XLSX extraction. No applicant columns enter output."""
import argparse, csv, json, re, zipfile
from pathlib import Path
import xml.etree.ElementTree as E

IDS = ['auckland-digital-security-120','auckland-it-180','otago-applied-cs-180','massey-info-sciences-180','wellington-business-analysis-180','wellington-cs-180','wellington-ux-180','canterbury-bis-180','canterbury-professional-cs-180','waikato-digital-business-180','waikato-it-180','waikato-it-240','lincoln-applied-computing-180','aut-it-project-120','aut-cis-180','op-bis-180','eit-it-180','eit-it-240','unitec-computing-180','sit-it-180','weltec-it-180','wintec-applied-it-180','ucol-it-180','nmit-it-180','ais-it-180','whitecliffe-cyber-180','nzse-bi-180']
FIELDS = ['id','country','institution','title','campuses','providerType','studyArea','qualification','programmeType','credits','durationMonths','intakeText','intakeDates','intakeStatuses','feeAmount','feeCurrency','feeScope','feeYear','feeLabel','feeBasis','sourceUrl','verification','lastVerifiedAt','entry','deadline','otherFees']

def extract(path):
 n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 with zipfile.ZipFile(path) as z:
  strings=[''.join(t.itertext()) for t in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',n)] if 'xl/sharedStrings.xml' in z.namelist() else []
  wb=E.fromstring(z.read('xl/workbook.xml')); sheets=wb.find('s:sheets',n)
  sheet=next(s for s in sheets if s.attrib['name']=='Compare courses')
  rid=sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
  rel=next(r for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels')) if r.attrib['Id']==rid)
  target=rel.attrib['Target']; target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  rows=[]
  for r in E.fromstring(z.read(target)).findall('.//s:row',n):
   if int(r.attrib['r']) < 6: continue
   d={}
   for c in r:
    col=re.sub(r'\d','',c.attrib['r']); v=c.find('s:v',n); inline=c.find('s:is',n)
    d[col]=strings[int(v.text)] if c.attrib.get('t')=='s' and v is not None else ''.join(inline.itertext()) if inline is not None else v.text if v is not None else ''
   if d.get('A'): rows.append(d)
 if len(rows)!=27: raise ValueError(f'Expected 27 rows; got {len(rows)}. Review mapping before importing.')
 out=[]
 mapping=json.loads((Path(__file__).parent/'nz-row-ids.json').read_text())
 for i,d in enumerate(rows):
  title=d['B']; basis=d.get('P',''); text=d.get('G','')
  months={'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}
  dates=[]
  for m in re.finditer(r'(?:(\d{1,2})\s+)?('+'|'.join(months)+r')', text):
   dates.append(f"2027-{months[m[2]]:02d}"+(f'-{int(m[1]):02d}' if m[1] else ''))
  dates=dates or ['unknown']
  area='Design' if 'Design' in title else 'Business & management' if any(x in title for x in ['Business','Management']) else 'Computing & technology'
  estimate=any(x in basis.lower() for x in ['estimate','×','indicative','reference','brochure','older'])
  # Award-inclusive quote cannot safely serve as gross tuition.
  scope='partial' if 'advertised award' in basis else 'full'
  amount=d.get('E','')
  out.append(dict(zip(FIELDS,[mapping[d.get('S','')+'|'+d.get('N','')],'NZ',d['A'],title,d.get('C','').replace(' / ','|'),'University' if d.get('L')=='University' else d.get('L'),area,'Master’s degree (Level 9)',d.get('M',''),d.get('N',''),d.get('O',''),text,'|'.join(dates),'|'.join('unknown' if x=='unknown' else 'tentative' for x in dates),amount,'NZD',scope,'2027' if '2027' in basis else '2026' if '2026' in basis else '', 'Estimated' if estimate else 'Unverified',basis,d.get('S',''),'unverified','','Ask admissions to confirm degree equivalence, grade, subject prerequisites and English requirements.','','Not confirmed; request a separate compulsory-fee quote.'])))
 return out

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('input',nargs='?',default='data/import/NZ_Masters_2027_Sortable.xlsx');p.add_argument('--output',default='data/import/catalogue.csv');a=p.parse_args()
 rows=extract(a.input);Path(a.output).parent.mkdir(parents=True,exist_ok=True)
 with open(a.output,'w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(rows)
 report={'sheet':'Compare courses','inputRows':27,'outputRecords':len(rows),'excludedColumns':['Admission','Contact priority','Personal fit','What to verify','Application status','QS world rank','Full fee INR lakh'],'unknownDuration':sum(not r['durationMonths'] for r in rows),'unknownFee':sum(not r['feeAmount'] for r in rows),'verification':'Imported facts remain unverified; see source-checks.json for scoped checks.','pathways':IDS}
 Path('docs/import-report.json').write_text(json.dumps(report,indent=2)+'\n')
 print(f'Extracted {len(rows)} public pathways to {a.output}. No catalogue was replaced. Run npm run catalogue:preview -- {a.output}')
