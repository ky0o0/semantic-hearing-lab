"""Prepare attributed stereo assets and low-resolution RMS envelopes. Requires numpy and ffmpeg."""
import csv,json,re,urllib.request,subprocess,wave,concurrent.futures
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]; out=root/'public/audio'; out.mkdir(exist_ok=True)
urllib.request.urlretrieve('https://raw.githubusercontent.com/karoldvl/ESC-50/master/meta/esc50.csv','/tmp/esc.csv')
rows=list(csv.DictReader(open('/tmp/esc.csv')))
license_text=(out/'ESC50-LICENSE.txt').read_text()
mapping={'dog':'dog','birds_chirping':'chirping_birds','cat':'cat','baby_cry':'crying_baby','cock_a_doodle_doo':'rooster','cricket':'crickets','glass_breaking':'glass_breaking','computer_typing':'keyboard_typing','ocean':'sea_waves','door_knock':'door_wood_knock','siren':'siren','alarm_clock':'clock_alarm','car_horn':'car_horn','thunderstorm':'thunderstorm','toilet_flush':'toilet_flush'}
credits=[]
def recorded(pair):
    key,category=pair
    candidates=[r for r in rows if r['category']==category]
    def attribution(r):
        stem='-'.join(r['filename'].split('-')[:3])+'.ogg'
        return next((l for l in license_text.splitlines() if '['+stem+']' in l),'')
    r=next((r for r in candidates if '[CC0]' in attribution(r)),candidates[0]); line=attribution(r)
    url='https://raw.githubusercontent.com/karoldvl/ESC-50/master/audio/'+r['filename']
    p=Path('/tmp')/(key+'.wav'); urllib.request.urlretrieve(url,p)
    credits.append({'id':key,'source':url,'attribution':line,'license':'CC BY-NC 3.0 (ESC-50 compilation); underlying recording license in attribution','changes':'Cropped, normalized, resampled and converted to stereo MP3.'})
    return key,p
sources=list(concurrent.futures.ThreadPoolExecutor(8).map(recorded,mapping.items()))
sr=24000; t=np.arange(sr*5)/sr; rng=np.random.default_rng(17)
def save(key,x):
    x=x/(max(abs(x))+1e-8)*.7;p=Path('/tmp')/(key+'.wav')
    with wave.open(str(p),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((x*32767).astype('<i2').tobytes())
    sources.append((key,p));credits.append({'id':key,'source':'scripts/prepare_audio.py','license':'CC0-1.0','attribution':'Original procedural synthesis for Semantic Hearing Lab.','changes':'Normalized and converted to stereo MP3.'})
x=np.zeros_like(t)
for start in [.3,1,1.8,3.1,3.7]:
    u=np.maximum(0,t-start); x+=(t>=start)*np.exp(-u*35)*(rng.normal(0,1,len(t))*.4+np.sin(2*np.pi*220*u))
save('hammer',x)
x=np.zeros_like(t)
for start in [.7,2.3,3.8]:
    u=np.maximum(0,t-start); x+=(t>=start)*np.exp(-u*22)*(rng.normal(0,1,len(t))+np.sin(2*np.pi*70*u)*.7)
save('gunshot',x)
x=np.zeros_like(t)
for i,f in enumerate([261.63,329.63,392,523.25,440,392,329.63,293.66]):
    u=np.maximum(0,t-i*.55);x+=(t>=i*.55)*np.exp(-u*5)*(np.sin(2*np.pi*f*u)+.35*np.sin(4*np.pi*f*u)+.1*np.sin(6*np.pi*f*u))
save('music',x)
# A formant-filtered harmonic voice sings a short original, wordless melody.
x=np.zeros_like(t)
for i,f in enumerate([220,261.63,293.66,261.63,329.63,293.66]):
    u=t-i*.75;mask=(u>=0)&(u<.7);env=np.clip(u/.08,0,1)*np.clip((.7-u)/.12,0,1)
    phase=2*np.pi*f*u+.06*np.sin(2*np.pi*5*u)
    for h in range(1,30):
        amp=sum(np.exp(-((h*f-F)/bw)**2) for F,bw in [(750,130),(1200,180),(2600,250)])/h
        x+=mask*env*amp*np.sin(h*phase)
save('singing',x)
url='https://librosa.org/data/audio/5703-47212-0000.ogg'
try:
    p=Path('/tmp/speech.ogg');urllib.request.urlretrieve(url,p);sources.append(('speech',p));credits.append({'id':'speech','source':url,'license':'CC BY 4.0','attribution':'LibriSpeech (Panayotov et al., 2015), Ashiel Mystery chapter 2, narrated by Garth Comira. LibriSpeech 5703-47212-0000. https://www.openslr.org/12/','changes':'Cropped, normalized, resampled and converted to stereo MP3.'})
except Exception as e:raise RuntimeError('Speech download failed') from e
for key in ['outdoor','room','street']:
    noise=rng.normal(0,1,len(t));smooth=np.convolve(noise,np.ones(40)/40,'same')
    x=smooth*(.6+.2*np.sin(2*np.pi*.3*t))
    if key=='room':x+=.06*np.sin(2*np.pi*100*t)
    if key=='street':x+=.1*np.sin(2*np.pi*65*t)*(1+np.sin(2*np.pi*.2*t))
    save(key,x)
envelopes={}
for key,p in sources:
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-t','5','-af','loudnorm=I=-20:TP=-3:LRA=7','-ar',str(sr),'-ac','1','-f','f32le','-'])
    a=np.frombuffer(raw,dtype='<f4'); a=np.pad(a,(0,max(0,sr*5-len(a))))[:sr*5]
    envelopes[key]=[round(float(np.sqrt(np.mean(z*z))),5) for z in a.reshape(100,-1)]
    # Stereo files; Web Audio supplies time-varying spatial placement.
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(sr),'-ac','1','-i','-','-ac','2','-codec:a','libmp3lame','-b:a','96k',str(out/(key+'.mp3'))],input=a.tobytes(),check=True)
(out/'envelopes.json').write_text(json.dumps(envelopes))
(out/'sources.json').write_text(json.dumps(sorted(credits,key=lambda x:x['id']),indent=2))
print('Prepared',len(sources),'stereo assets')
