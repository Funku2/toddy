"""Build a Biological Edge short from a settings file.

Runs inside the Higgsfield sandbox (needs ffmpeg, sox, faster-whisper and the
video-montage caption scripts). See docs/short-video-template.md for the rules
this implements, and tools/shorts/*.json for example settings.

    python3 build_short.py <narration part A> <narration part B> <settings.json>

The narration parts are local files or file names on the Higgsfield CDN.
An upload_url.txt holding a presigned Higgsfield upload URL must sit beside it.
"""
import subprocess, sys, re, json, os
def sh(c, check=True):
    r = subprocess.run(c, shell=True, capture_output=True, text=True)
    if check and r.returncode != 0:
        print("FAILED:", c[:300], "\n", r.stderr[-1500:]); sys.exit(1)
    return r.stdout.strip()
def dur(f): return float(sh(f"ffprobe -v error -show_entries format=duration -of csv=p=0 {f}"))
B = "https://d8j0ntlcm91z4.cloudfront.net/user_38POUYdGIKhepiuwe8QiYWhfYJ8/"
CFG = json.load(open(sys.argv[3]))
A = CFG["clips"]
for k,v in A.items():
    if not os.path.exists(k+".mp4"): sh(f"curl -sSf -o {k}.mp4 {B}{v}")
if not os.path.exists("music.mp3"): sh(f"curl -sSf -o music.mp3 {B}{CFG['music']}")
voA, voB = sys.argv[1], sys.argv[2]
for n,v in (("voA.wav",voA),("voB.wav",voB)):
    src = v if os.path.exists(v) else None
    if not src: sh(f"curl -sSf -o dl_{n}.src {B}{v}"); src = f"dl_{n}.src"
    sh(f"ffmpeg -loglevel error -y -i {src} -ar 48000 -ac 1 {n}")
sh('bash "$HF_WORKFLOWS/video-montage/scripts/fetch_fonts.sh" >/dev/null 2>&1 || true', check=False)
def tight(i, o, cap):
    # trim leading/trailing silence with margin, then shorten only long pauses by removing
    # the MIDDLE of each silence, keeping cap/2 untouched on both sides so no consonant is cut
    t = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.06"
    sh(f'ffmpeg -loglevel error -y -i {i} -af "{t},areverse,{t},areverse" -ar 48000 -ac 1 _t.wav')
    r = subprocess.run("ffmpeg -hide_banner -i _t.wav -af silencedetect=noise=-45dB:d=0.25 -f null -", shell=True, capture_output=True, text=True).stderr
    st_ = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", r)]
    en_ = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r)]
    D = dur("_t.wav"); keep, pos = [], 0.0
    for a_, b_ in zip(st_, en_):
        if b_ - a_ > cap and a_ > 0.05 and b_ < D - 0.05:
            keep.append((pos, a_ + cap/2)); pos = b_ - cap/2
    keep.append((pos, D))
    fc = "".join(f"[0:a]atrim={x:.3f}:{y:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={y-x-0.012:.3f}:d=0.012[k{n}];" for n,(x,y) in enumerate(keep))
    fc += "".join(f"[k{n}]" for n in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1,loudnorm=I=-18:TP=-2:LRA=11,aresample=48000[o]"
    sh(f'ffmpeg -loglevel error -y -i _t.wav -filter_complex "{fc}" -map "[o]" -ac 1 {o}')
    print("TIGHT", i, "from", round(D,2), "to", round(dur(o),2), "pauses shortened", len(keep)-1)
tight("voA.wav","tA.wav",0.40); tight("voB.wav","tB.wav",0.30)
LEAD, GAP = 0.12, 0.30
sh(f'ffmpeg -loglevel error -y -i tA.wav -i tB.wav -filter_complex "[0:a]adelay={int(LEAD*1000)}:all=1,apad=pad_dur={GAP}[a];[1:a]volume=1.0[b];[a][b]concat=n=2:v=0:a=1,apad=pad_dur=0.2[o]" -map "[o]" -ar 48000 -ac 2 narration.wav')
ND = dur("narration.wav"); print("NARRATION", round(ND,2), "A", round(dur("tA.wav"),2), "B", round(dur("tB.wav"),2))
S = CFG["script"]
json.dump({"blocks":[{"vo_line":s} for s in S]}, open("script_manifest.json","w"))

# pronunciation check: recognise the finished narration with no script, compare word for word
from faster_whisper import WhisperModel
_m = WhisperModel("small", device="cpu", compute_type="int8")
_ws = []
for _f in ("tA.wav", "tB.wav"):  # checked per part: joining them first makes the recogniser repeat words at the seam
    _segs,_ = _m.transcribe(_f, language="en", word_timestamps=True, condition_on_previous_text=False, beam_size=5, temperature=0)
    _ws += [w for s_ in _segs for w in s_.words]
def _n(x):
    x = re.sub(r"[^a-z0-9' ]", "", x.lower()).replace("50","fifty").replace("3","three").replace("you're","your")
    return x.split()
heard, want = _n(" ".join(w.word for w in _ws)), _n(" ".join(S))
print("HEARD:", " ".join(heard))
print("WORD_MATCH", heard == want, "| lowest confidence:", " ".join(f"{w.word.strip()}:{w.probability:.2f}" for w in sorted(_ws, key=lambda w: w.probability)[:5]))
if heard != want:
    import difflib
    print("DIFF:", [d for d in difflib.ndiff(want, heard) if d[0] in "+-"]); sys.exit(1)
r = subprocess.run('python3 "$HF_WORKFLOWS/video-montage/scripts/audio_to_captions.py" narration.wav --srt caps.srt --script script_manifest.json --language en --max-words 3', shell=True, capture_output=True, text=True)
open("stt.log","w").write(r.stdout + r.stderr)
if r.returncode != 0: print("STT FAILED", (r.stdout+r.stderr)[-1200:]); sys.exit(1)
m = re.search(r'"similarity":\s*([0-9.]+)', r.stdout); print("SIMILARITY", m.group(1) if m else "?")
def ts(x):
    h,mi,s = x.replace(",",".").split(":"); return int(h)*3600+int(mi)*60+float(s)
cues = []
for blk in open("caps.srt").read().strip().split("\n\n"):
    L = blk.strip().split("\n")
    if len(L) < 3: continue
    a,b = L[1].split(" --> "); cues.append([ts(a), ts(b), " ".join(L[2:]).strip()])
sent, cur = [], []
for c in cues:
    cur.append(c)
    if c[2].rstrip().endswith((".", "!", "?")): sent.append(cur); cur = []
if cur: sent.append(cur)
print("SENTENCES", len(sent))
for i,s in enumerate(sent): print(f"  {i:2d} {s[0][0]:6.2f}-{s[-1][1]:6.2f} {' '.join(c[2] for c in s)}")
if len(sent) != len(S): print("UNEXPECTED SENTENCE COUNT"); sys.exit(1)
st = [s[0][0] for s in sent]
VD = round(sent[-1][-1][1] + 0.30, 2)
PAIN = "eq=saturation=0.30:contrast=1.10:brightness=-0.01"
GR = {None: None, "pain": PAIN, "pain_dark": "eq=gamma=1.5:brightness=0.05," + PAIN, "flash": "fade=t=in:st=0:d=0.14:color=white"}
# each shot: [sentence, clip, in-point, zoom, centre x, centre y, grade, (optional) caption cue within the sentence]
SHOTS = [(x[0],x[1],x[2],x[3],x[4],x[5],GR[x[6]]) for x in CFG["shots"]]
CUE = [(x[7] if len(x) > 7 else 0) for x in CFG["shots"]]  # optional 8th value: start on the Nth caption cue inside the sentence
LP = CFG.get("loop_point")
cuts = [0.0] + [round(sent[s[0]][min(CUE[n+1], len(sent[s[0]])-1)][0] - 0.05, 3) for n,s in enumerate(SHOTS[1:])] + [VD]
open("list.txt","w").close(); table = []
for i,(si,clip,inp,z,cx,cy,g) in enumerate(SHOTS):
    d = round(cuts[i+1]-cuts[i], 3)
    cd = dur(clip+".mp4")
    if LP and i == len(SHOTS)-1:
        # the last shot ends exactly where the first shot begins, so the video loops
        inp = max(0.0, LP - d); avail = LP - inp
    else: avail = cd - inp - 0.06
    f = max(1.0, d/avail)
    vf = (g + "," if g else "") + f"setpts={f:.4f}*PTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    if z > 1.0:
        w,h = 1080/z, 1920/z
        vf += f",crop={w:.0f}:{h:.0f}:{(1080-w)*cx:.0f}:{(1920-h)*cy:.0f},scale=1080:1920"
    vf += ",fps=30,format=yuv420p"
    sh(f'ffmpeg -loglevel error -y -ss {inp} -i {clip}.mp4 -an -vf "{vf}" -t {d} -c:v libx264 -preset medium -crf 16 s{i:02d}.mp4')
    open("list.txt","a").write(f"file 's{i:02d}.mp4'\n")
    table.append((i, cuts[i], d, clip, round(inp,2), round(f,2)))
sh("ffmpeg -loglevel error -y -f concat -safe 0 -i list.txt -c copy silent.mp4")
SD = dur("silent.mp4"); print("VIDEO", round(SD,2), "target", VD)
print("SHOTS", len(table), "longest", max(t[2] for t in table), "avg", round(sum(t[2] for t in table)/len(table),2))
for t in table: print("  shot %02d at %5.2f dur %4.2f %-3s in %4.2f slow x%.2f" % t)
# sound effects
X = "sox -n -r 48000 -c 2"
sh(f"{X} hit.wav synth 0.9 sine 72:36 fade q 0.004 0.9 0.8 gain -2")
sh(f"{X} nb.wav synth 1.1 brownnoise lowpass 380 fade q 0.004 1.1 1.0 gain -6")
sh("sox -m -v 1 hit.wav -v 1 nb.wav impact.wav reverb 45 gain -1")
sh(f"{X} whoosh.wav synth 0.42 pinknoise bandpass 1100 1.1q fade q 0.24 0.42 0.16 gain -15")
sh(f"{X} r1.wav synth 1.3 whitenoise highpass 1800 fade q 1.26 1.3 0.03 gain -17")
sh(f"{X} r2.wav synth 1.3 sine 220:1300 fade q 1.26 1.3 0.03 gain -22")
sh("sox -m -v 1 r1.wav -v 1 r2.wav riser.wav")
TI, PI = CFG["turn_shot"], CFG["pay_shot"]
TURN, PAY = cuts[TI], cuts[PI]
ev = [("hit.wav",0.0,0.9),("riser.wav",max(0,TURN-1.3),1.0),("impact.wav",TURN,1.0),("impact.wav",PAY,0.7)]
for i in [i for i in range(1,len(SHOTS)) if i not in (TI,PI) and (i < TI or i % 2 == 0)]: ev.append(("whoosh.wav", max(0,cuts[i]-0.2), 1.0))
inp = f"-i narration.wav -ss {CFG.get('music_offset',4.5)} -i music.mp3 " + " ".join(f"-i {e[0]}" for e in ev)
fc = f"[0:a]volume=1.45[v];[1:a]atrim=0:{SD},asetpts=PTS-STARTPTS,volume='if(lt(t,{TURN}),0.09,0.27)':eval=frame,afade=t=in:d=0.25,afade=t=out:st={SD-0.2}:d=0.2[m];"
lab = []
for k,e in enumerate(ev):
    fc += f"[{k+2}:a]volume={e[2]},adelay={int(e[1]*1000)}:all=1[x{k}];"; lab.append(f"[x{k}]")
fc += "[v][m]" + "".join(lab) + f"amix=inputs={len(ev)+2}:normalize=0:duration=longest,volume=-2.0dB,alimiter=limit=0.84:level=0,atrim=0:{SD}[a]"
sh(f'ffmpeg -loglevel error -y {inp} -filter_complex "{fc}" -map "[a]" -ar 48000 -ac 2 mix.wav')
# captions (ASS)
KEY = set(CFG["key"]); HL = CFG.get("highlight_bgr", "3DC8FF")
def at(x):
    x = max(0,x); return "%d:%02d:%05.2f" % (int(x//3600), int(x%3600//60), x%60)
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Montserrat ExtraBold,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,9,4,5,70,70,0,1
Style: Hook,Montserrat ExtraBold,52,&H00FFFFFF,&H00FFFFFF,&H001E54D9,&H001E54D9,1,0,0,0,100,100,3,0,3,16,0,8,60,60,330,1
Style: WM,Montserrat ExtraBold,28,&H66FFFFFF,&H66FFFFFF,&HB4000000,&H00000000,1,0,0,0,100,100,6,0,1,2,0,8,60,60,214,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
ev2 = [f"Dialogue: 0,{at(0)},{at(SD)},WM,,0,0,0,,THE BIOLOGICAL EDGE", f"Dialogue: 1,{at(0)},{at(min(2.0,cuts[1]))},Hook,,0,0,0,," + CFG.get("hook_tag","FOR MEN OVER 40")]
flat = [c for s in sent for c in s]; words = 0
for i,c in enumerate(flat):
    end = c[1]
    if i+1 < len(flat) and flat[i+1][0]-c[1] < 0.35: end = flat[i+1][0]
    out = []
    for w in c[2].upper().split():
        core = re.sub(r"[^A-Z']", "", w); words += 1
        out.append("{\\c&H"+HL+"&}"+core+"{\\c&HFFFFFF&}" if core in KEY else core)
    ev2.append(f"Dialogue: 2,{at(c[0])},{at(end)},Cap,,0,0,0,," + "{\\pos(540,1430)\\fscx82\\fscy82\\t(0,90,\\fscx100\\fscy100)}" + " ".join(out))
open("caps.ass","w").write(head + "\n".join(ev2) + "\n")
print("CAPTION_CUES", len(flat), "WORDS", words)
sh('ffmpeg -loglevel error -y -i silent.mp4 -i mix.wav -vf "subtitles=caps.ass:fontsdir=/usr/share/fonts/truetype/higgsfield" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4')
print("FINAL v", sh("ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 final.mp4"), "a", sh("ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 final.mp4"))
print(sh("ffmpeg -hide_banner -i final.mp4 -af loudnorm=print_format=summary -vn -f null - 2>&1 | grep -E 'Input Integrated|Input True Peak'"))
mids = [round(cuts[i]+ (cuts[i+1]-cuts[i])*0.55,2) for i in range(len(SHOTS))]
for half,idx in (("a",range(0,8)),("b",range(len(SHOTS)-8,len(SHOTS)))):
    ins = ""
    for n,i in enumerate(idx):
        sh(f"ffmpeg -loglevel error -y -ss {mids[i]} -i final.mp4 -frames:v 1 -vf scale=189:336 fr{i:02d}.jpg"); ins += f"-i fr{i:02d}.jpg "
    sh(f"ffmpeg -loglevel error -y {ins} -filter_complex hstack=inputs=8 -q:v 5 sheet_{half}.jpg")
url = open("upload_url.txt").read().strip()
print("PUT_HTTP", sh(f"curl -sS -f -o /dev/null -w '%{{http_code}}' -X PUT -H 'Content-Type: video/mp4' --data-binary @final.mp4 '{url}'"))
print("BUILD_DONE")
