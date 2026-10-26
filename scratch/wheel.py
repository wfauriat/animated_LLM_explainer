import math

def cog_svg(teeth=9, r_outer=100, r_root=80, r_hole=25,
            tip_frac=0.30, base_frac=0.50, size=260,
            fill="#8a94a6", stroke="#2b3240", filename="cog.svg"):
    """
    teeth      : number of teeth
    r_outer    : radius at tooth tips
    r_root     : radius at the bottom of the gaps
    r_hole     : radius of the central hole
    tip_frac   : tooth width at the tip, as a fraction of the pitch angle
    base_frac  : tooth width at the root, as a fraction of the pitch angle
                 (must be > tip_frac for a trapezoidal tooth)
    """
    c = size / 2
    pitch = 2 * math.pi / teeth

    def pt(r, a):
        return c + r * math.cos(a), c + r * math.sin(a)

    d = []
    for i in range(teeth):
        a0 = i * pitch
        # four corners of the tooth: root-left, tip-left, tip-right, root-right
        p1 = pt(r_root,  a0 - base_frac * pitch / 2)
        p2 = pt(r_outer, a0 - tip_frac  * pitch / 2)
        p3 = pt(r_outer, a0 + tip_frac  * pitch / 2)
        p4 = pt(r_root,  a0 + base_frac * pitch / 2)

        if i == 0:
            d.append(f"M {p1[0]:.2f} {p1[1]:.2f}")
        else:
            # arc along the root circle from the previous tooth to this one
            d.append(f"A {r_root} {r_root} 0 0 1 {p1[0]:.2f} {p1[1]:.2f}")
        d.append(f"L {p2[0]:.2f} {p2[1]:.2f}")
        d.append(f"L {p3[0]:.2f} {p3[1]:.2f}")
        d.append(f"L {p4[0]:.2f} {p4[1]:.2f}")

    # close the outline with a final root arc back to the start
    start = pt(r_root, -base_frac * pitch / 2)
    d.append(f"A {r_root} {r_root} 0 0 1 {start[0]:.2f} {start[1]:.2f} Z")

    # central hole (drawn as a circle path; evenodd fill cuts it out)
    d.append(f"M {c - r_hole} {c} "
             f"a {r_hole} {r_hole} 0 1 0 {2*r_hole} 0 "
             f"a {r_hole} {r_hole} 0 1 0 {-2*r_hole} 0 Z")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <path d="{' '.join(d)}" fill="{fill}" fill-rule="evenodd" stroke="{stroke}" stroke-width="3" stroke-linejoin="round"/>
</svg>
"""
    with open(filename, "w") as f:
        f.write(svg)
    print(f"Saved {filename}")

if __name__ == "__main__":
    cog_svg()