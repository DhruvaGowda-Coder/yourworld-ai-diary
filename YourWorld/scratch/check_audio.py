import wave
import os

audio_dir = r'c:\Users\dhruv\Projects\Online_Elemental-Diary-main\Online_Elemental-Diary-main\YourWorld\static\audio'
files = [f for f in os.listdir(audio_dir) if f.endswith('.wav') or f.endswith('.mp3')]

print(f"{'Theme File':<20} | {'Type':<5} | {'Duration (s)':<12} | {'Size (KB)':<10}")
print("-" * 55)

for f in sorted(files):
    path = os.path.join(audio_dir, f)
    size_kb = os.path.getsize(path) // 1024
    
    if f.endswith('.wav'):
        try:
            with wave.open(path, 'r') as w:
                frames = w.getnframes()
                rate = w.getframerate()
                duration = frames / float(rate)
                print(f"{f:<20} | {'WAV':<5} | {duration:<12.2f} | {size_kb:<10}")
        except:
            print(f"{f:<20} | {'WAV':<5} | {'Error':<12} | {size_kb:<10}")
    else:
        # For MP3, we can only guess without a library like mutagen
        # But we can look at the size.
        print(f"{f:<20} | {'MP3':<5} | {'~ (MP3 file)':<12} | {size_kb:<10}")
