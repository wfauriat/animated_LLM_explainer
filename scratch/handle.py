import math

C30 = math.cos(math.radians(30))

def iso(p):
    """3D (x, y, z) -> 2D isometric. z is up; the viewer sits at (+x, +y, +z)."""
    x, y, z = p
    return (x - y) * C30, (x + y) * 0.5 - z

def depth(p):
    return p[0] + p[1] + p[2]          # larger = closer to the viewer

def crank_svg(shaft_len=220, arm_len=110, grip_len=130,
              shaft_w=16, arm_w=16, grip_w=30,
              filename="crank.svg", pad=40):

    steel = ("#2b3240", "#8d98a8", "#d9dfe8")   # outline, body, highlight
    wood  = ("#4a2a14", "#a8693a", "#e3ab74")

    # --- 3D geometry: (start, end, width, palette) -----------------------
    A = (-shaft_len, 0, 0)          # tip of the shaft (engine end)
    B = (0, 0, 0)                   # shaft -> arm bend
    Cc = (0, 0, arm_len)            # arm -> grip bend
    D = (grip_len, 0, arm_len)      # free end of the grip

    segs = [
        (A, B,  shaft_w, steel),                                   # shaft
        (B, Cc, arm_w,   steel),                                   # arm
        (Cc, D, grip_w,  wood),                                    # wooden grip
        # cross pin near the engine end (the part that engages the dog clutch)
        ((A[0] + 25, -28, 0), (A[0] + 25, 28, 0), shaft_w * 0.7, steel),
        # metal collars at both ends of the grip
        ((Cc[0] + 4, 0, arm_len), (Cc[0] + 16, 0, arm_len), grip_w + 8, steel),
        ((D[0] - 16, 0, arm_len), (D[0] - 4, 0, arm_len),   grip_w + 8, steel),
    ]

    # --- painter's algorithm: far segments first -------------------------
    def seg_depth(s):
        a, b = s[0], s[1]
        return depth(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2))
    segs.sort(key=seg_depth)

    # --- project and compute the bounding box ----------------------------
    pts2d = [(iso(a), iso(b), w, pal) for a, b, w, pal in segs]
    xs = [p[0] for s in pts2d for p in (s[0], s[1])]
    ys = [p[1] for s in pts2d for p in (s[0], s[1])]
    margin = grip_w + pad
    minx, maxx = min(xs) - margin, max(xs) + margin
    miny, maxy = min(ys) - margin, max(ys) + margin
    W, H = maxx - minx, maxy - miny

    def tx(p):
        return p[0] - minx, p[1] - miny

    # --- draw each segment as a "tube": outline, body, highlight ---------
    out = []
    for p0, p1, w, (dark, mid, light) in pts2d:
        x0, y0 = tx(p0)
        x1, y1 = tx(p1)
        k = w * 0.18                       # highlight offset (light from top-left)
        for width, color, dx, dy, op in [
            (w + 5,    dark,  0,  0, 1.0),
            (w,        mid,   0,  0, 1.0),
            (w * 0.30, light, -k, -k, 0.75),
        ]:
            out.append(
                f'<line x1="{x0+dx:.1f}" y1="{y0+dy:.1f}" '
                f'x2="{x1+dx:.1f}" y2="{y1+dy:.1f}" stroke="{color}" '
                f'stroke-width="{width:.1f}" stroke-linecap="round" '
                f'opacity="{op}"/>')

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" '
           f'height="{H:.0f}" viewBox="0 0 {W:.0f} {H:.0f}">\n  '
           + "\n  ".join(out) + "\n</svg>\n")

    with open(filename, "w") as f:
        f.write(svg)
    print(f"Saved {filename}")

if __name__ == "__main__":
    crank_svg()