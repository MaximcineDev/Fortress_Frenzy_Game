"""Original Fortress Frenzy 16-bar fanfare; outputs a seamless PCM loop for MP3 encoding.
Requires numpy and scipy only to regenerate. The game ships the encoded MP3.
"""
import numpy as np
from scipy.io.wavfile import write
SR=44100; BEAT=.6; DURATION=64*BEAT
rng=np.random.default_rng(24)
mix=np.zeros((round(DURATION*SR),2),np.float64)
def note(beat,midi,beats,kind='horn',vol=.10,pan=0):
 t=np.arange(round(beats*BEAT*SR))/SR;freq=440*2**((midi-69)/12)
 attack=.045 if kind=='horn' else .012
 env=np.minimum(t/attack,1)*np.minimum((len(t)/SR-t)/.10,1)
 if kind=='pluck':
  wave=sum(np.sin(2*np.pi*freq*h*t)*(.5**(h-1)) for h in range(1,5));env*=np.exp(-t*4)
 elif kind=='strings':
  wave=sum(np.sin(2*np.pi*freq*h*t+np.sin(2*np.pi*4.7*t)*.008*h)/h**1.5 for h in range(1,7));env*=.65
 else:wave=sum(np.sin(2*np.pi*freq*h*t)*a for h,a in [(1,1),(2,.35),(3,.16),(4,.08)])
 signal=wave*env*vol
 idx=(round(beat*BEAT*SR)+np.arange(len(t)))%len(mix)
 mix[idx,0]+=signal*np.sqrt((1-pan)/2);mix[idx,1]+=signal*np.sqrt((1+pan)/2)
def drum(beat,strong=False):
 t=np.arange(int(SR*.28))/SR
 wave=np.sin(2*np.pi*(70*t-45*t*t))*np.exp(-t*18)*.16
 if not strong:wave+=rng.normal(0,.024,len(t))*np.exp(-t*28)
 idx=(round(beat*BEAT*SR)+np.arange(len(t)))%len(mix)
 mix[idx]+=wave[:,None]
# D minor / Bb / F / C, resolved through A to D.
chords=[(50,57,62,65),(46,53,58,62),(41,53,57,60),(48,55,60,64)]*3+[(46,53,58,62),(48,55,60,64),(45,52,57,61),(50,57,62,65)]
melodies=[ [74,77,81,77], [74,70,74,77], [72,69,72,77], [76,74,72,67],
 [74,77,81,84], [82,81,77,74], [77,76,72,69], [72,76,79,76],
 [81,77,74,77], [82,77,74,70], [81,77,72,69], [79,76,72,67],
 [70,74,77,74], [72,76,79,76], [73,76,81,73], [74,77,81,74] ]
for bar,chord in enumerate(chords):
 for j,n in enumerate(chord[1:]):note(bar*4,n,3.9,'strings',.025,(j-1)*.5)
 for b in [0,2]:note(bar*4+b,chord[0],1.8,'pluck',.13,-.15);drum(bar*4+b,True)
 for b in [1,3]:drum(bar*4+b)
 for i,n in enumerate(melodies[bar]):note(bar*4+i,n,.88,'horn',.078,.12)
 for i in range(8):note(bar*4+i*.5,chord[1+i%3]+12,.45,'pluck',.028,-.5 if i%2 else .5)
# Circular delay/reverb keeps the loop boundary continuous.
for delay,gain in [(.13,.12),(.27,.08),(.41,.06)]:mix+=np.roll(mix,round(delay*SR),axis=0)[:,::-1]*gain
mix=np.tanh(mix*1.6);mix*=.80/max(np.max(np.abs(mix)),.01)
write('/tmp/fortress-intro.wav',SR,(mix*32767).astype(np.int16))
