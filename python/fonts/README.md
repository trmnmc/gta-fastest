# Branding fonts

Drop a blocky TrueType font here named **`minecraft.ttf`** to use the pixel/Minecraft
aesthetic for the burned-in server branding overlay (server name, IP, CTA).

If no `minecraft.ttf` is present, `render.py` falls back to ffmpeg's default
drawtext font — the overlay still renders, just without the blocky look.

Good options (check each font's license before redistributing):
- "Minecraftia" / "Monocraft" style pixel fonts
- Any monospaced pixel TTF

The on-screen caption styling (the `block` preset) requests the **"Press Start 2P"**
family via libass; install it system-wide for the closest match, otherwise libass
substitutes its default font.
