# Fortress Frenzy assets

Emblem generated with the built-in image-generation tool. Prompt: premium colourful 3D cartoon medieval mobile-game emblem, red knight helmet with silver visor, gold crown and blue/gold shield; centered on transparent background with generous safe margins, no text. The source is fortress-emblem.png. Sized launcher layers, round icons, launch emblem and the 512px store icon are derived from this asset; tools/prepare_android_icons.py regenerates them with Pillow.

Intro music is an original 16-bar composition synthesised for this game: D minor fanfare, horn-like lead, plucked arpeggios, strings, bass and drums at 100 BPM. No third-party recording or song was sampled. tools/compose_intro.py contains the composition and synthesis; it requires NumPy/SciPy to regenerate a temporary WAV. The shipped MP3 needs no Python dependencies at runtime. Encode with ffmpeg/libmp3lame at 128 kbps.

The track begins after the first interaction because browser/WebView audio needs a gesture. It loops quietly through menus and pauses in battle/background. Options stores music mute separately from SFX.
