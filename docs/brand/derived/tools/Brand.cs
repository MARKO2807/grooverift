// GrooveRift brand derivatives: pixel operations in plain .NET (System.Drawing), per D-029.
// Compiled at run time by build-derivatives.ps1 through Add-Type. No third-party code.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class Brand {
  // ---------- I/O (BGRA byte order, straight alpha) ----------
  public static byte[] Load(string p, out int w, out int h) {
    using (var b = new Bitmap(p)) {
      w = b.Width; h = b.Height;
      var d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var a = new byte[w * h * 4];
      for (int y = 0; y < h; y++) Marshal.Copy(d.Scan0 + y * d.Stride, a, y * w * 4, w * 4);
      b.UnlockBits(d); return a;
    }
  }
  public static Bitmap ToBitmap(byte[] a, int w, int h) {
    var b = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    var d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    for (int y = 0; y < h; y++) Marshal.Copy(a, y * w * 4, d.Scan0 + y * d.Stride, w * 4);
    b.UnlockBits(d); return b;
  }
  public static byte[] FromBitmap(Bitmap b) {
    int w = b.Width, h = b.Height;
    var d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var a = new byte[w * h * 4];
    for (int y = 0; y < h; y++) Marshal.Copy(d.Scan0 + y * d.Stride, a, y * w * 4, w * 4);
    b.UnlockBits(d); return a;
  }
  public static void Save(byte[] a, int w, int h, string p) { using (var b = ToBitmap(a, w, h)) b.Save(p, ImageFormat.Png); }

  static void Hsv(int r, int g, int b, out double hue, out int max, out int min) {
    max = Math.Max(r, Math.Max(g, b)); min = Math.Min(r, Math.Min(g, b)); hue = -1;
    if (max == min) return;
    double c = max - min;
    if (max == r) hue = 60 * (((g - b) / c) % 6); else if (max == g) hue = 60 * ((b - r) / c + 2); else hue = 60 * ((r - g) / c + 4);
    if (hue < 0) hue += 360;
  }

  // ---------- Step 1: clean the master ----------
  // Removes background-removal residue without touching the silhouette:
  //  (a) alpha below `floor` (under 3 % opacity: speckle, dark matte and green fringe) becomes fully transparent;
  //  (b) connected islands of alpha >= floor smaller than `minArea` pixels (loose specks in the background) are removed;
  //  (c) remaining low-alpha pixels (alpha < 64) whose colour is off-palette (green-yellow to blue hues, or a dark matte)
  //      take the average colour of their warm neighbours.
  // Pixels with alpha >= 64 are never modified; the caller verifies this.
  public static string Clean(string src, string dst, int floor, int minArea) {
    int w, h; var a = Load(src, out w, out h); int n = w * h;
    int cutFloor = 0, cutIsland = 0, recol = 0;
    for (int i = 0; i < n; i++) { int k = i * 4; if (a[k + 3] > 0 && a[k + 3] < floor) { a[k] = a[k + 1] = a[k + 2] = a[k + 3] = 0; cutFloor++; } else if (a[k + 3] == 0) { a[k] = a[k + 1] = a[k + 2] = 0; } }
    // (b) islands, 8-connectivity
    var label = new int[n]; var stack = new Stack<int>(); var sizes = new List<int>(); sizes.Add(0);
    for (int i = 0; i < n; i++) {
      if (a[i * 4 + 3] == 0 || label[i] != 0) continue;
      int id = sizes.Count, cnt = 0; label[i] = id; stack.Push(i);
      while (stack.Count > 0) {
        int p = stack.Pop(); cnt++; int px = p % w, py = p / w;
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
          int qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
          int q = qy * w + qx; if (label[q] == 0 && a[q * 4 + 3] != 0) { label[q] = id; stack.Push(q); }
        }
      }
      sizes.Add(cnt);
    }
    var kept = new List<int>();
    for (int id = 1; id < sizes.Count; id++) if (sizes[id] >= minArea) kept.Add(sizes[id]);
    for (int i = 0; i < n; i++) { int id = label[i]; if (id != 0 && sizes[id] < minArea) { int k = i * 4; a[k] = a[k + 1] = a[k + 2] = a[k + 3] = 0; cutIsland++; } }
    // (c) off-palette low-alpha pixels
    var orig = (byte[])a.Clone();
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      int k = (y * w + x) * 4; int al = orig[k + 3]; if (al == 0 || al >= 64) continue;
      double hue; int mx, mn; Hsv(orig[k + 2], orig[k + 1], orig[k], out hue, out mx, out mn);
      bool off = mx < 80 || (hue >= 62 && hue <= 300 && mx - mn >= 24);
      if (!off) continue;
      long sr = 0, sg = 0, sb = 0, sw = 0;
      for (int r = 2; r <= 12 && sw == 0; r += 2)
        for (int dy = -r; dy <= r; dy++) for (int dx = -r; dx <= r; dx++) {
          int qx = x + dx, qy = y + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
          int q = (qy * w + qx) * 4; int qa = orig[q + 3]; if (qa == 0) continue;
          double qh; int qmx, qmn; Hsv(orig[q + 2], orig[q + 1], orig[q], out qh, out qmx, out qmn);
          if (qmx < 80 || (qh >= 62 && qh <= 300 && qmx - qmn >= 24)) continue;
          sr += orig[q + 2] * qa; sg += orig[q + 1] * qa; sb += orig[q] * qa; sw += qa;
        }
      if (sw > 0) { a[k + 2] = (byte)(sr / sw); a[k + 1] = (byte)(sg / sw); a[k] = (byte)(sb / sw); recol++; }
      else { a[k] = a[k + 1] = a[k + 2] = a[k + 3] = 0; cutIsland++; }
    }
    Save(a, w, h, dst);
    kept.Sort(); kept.Reverse();
    return string.Format("floor<{0}: {1} px cleared; islands<{2} px: {3} px cleared ({4} islands total, kept {5}: {6}); recoloured {7} px",
      floor, cutFloor, minArea, cutIsland, sizes.Count - 1, kept.Count, string.Join(",", kept), recol);
  }

  // Verifies that every pixel with alpha >= minAlpha in `a` is byte-identical in `b`. Returns the count of differences.
  public static long Diff(string pa, string pb, int minAlpha) {
    int w, h, w2, h2; var a = Load(pa, out w, out h); var b = Load(pb, out w2, out h2);
    if (w != w2 || h != h2) return -1; long d = 0;
    for (int i = 0; i < w * h; i++) { int k = i * 4; if (a[k + 3] < minAlpha) continue; if (a[k] != b[k] || a[k + 1] != b[k + 1] || a[k + 2] != b[k + 2] || a[k + 3] != b[k + 3]) d++; }
    return d;
  }

  // Alpha bounding box (alpha >= t).
  public static int[] Bounds(string p, int t) {
    int w, h; var a = Load(p, out w, out h); int x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] >= t) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return new[] { x0, y0, x1, y1 };
  }

  // ---------- Step 2: size variants of the master ----------
  // Halves the image with HighQualityBicubic until it is within 2x of the target, then draws the final step.
  static Bitmap Shrink(Bitmap src, int tw, int th) {
    Bitmap cur = src; bool own = false;
    while (cur.Width / 2 >= tw * 2 && cur.Height / 2 >= th * 2) {
      var nb = new Bitmap(cur.Width / 2, cur.Height / 2, PixelFormat.Format32bppPArgb);
      using (var g = Graphics.FromImage(nb)) { g.CompositingMode = CompositingMode.SourceCopy; g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        using (var ia = new ImageAttributes()) { ia.SetWrapMode(WrapMode.TileFlipXY); g.DrawImage(cur, new Rectangle(0, 0, nb.Width, nb.Height), 0, 0, cur.Width, cur.Height, GraphicsUnit.Pixel, ia); } }
      if (own) cur.Dispose(); cur = nb; own = true;
    }
    var o = new Bitmap(tw, th, PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(o)) { g.CompositingMode = CompositingMode.SourceCopy; g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      using (var ia = new ImageAttributes()) { ia.SetWrapMode(WrapMode.TileFlipXY); g.DrawImage(cur, new Rectangle(0, 0, tw, th), 0, 0, cur.Width, cur.Height, GraphicsUnit.Pixel, ia); } }
    if (own) cur.Dispose(); return o;
  }

  static void RoundRect(Graphics g, Brush b, float x, float y, float w, float h, float r) {
    if (r <= 0) { g.FillRectangle(b, x, y, w, h); return; }
    using (var p = new GraphicsPath()) { float d = r * 2; p.AddArc(x, y, d, d, 180, 90); p.AddArc(x + w - d, y, d, d, 270, 90); p.AddArc(x + w - d, y + h - d, d, d, 0, 90); p.AddArc(x, y + h - d, d, d, 90, 90); p.CloseFigure(); g.FillPath(b, p); }
  }

  // Places the symbol in an n x n square. box = the symbol's visible bounds in the source (x0,y0,x1,y1);
  // widthFrac = symbol width as a share of n; bg = "none" or a hex colour; radiusFrac = tile corner radius as a share of n.
  public static void Icon(string src, int[] box, int n, double widthFrac, string bg, double radiusFrac, string dst) {
    using (var full = new Bitmap(src)) {
      int bw = box[2] - box[0] + 1, bh = box[3] - box[1] + 1;
      // crop a square around the symbol's centre so the scale is uniform; the crop side = bw / widthFrac
      int side = (int)Math.Round(bw / widthFrac); int cx = box[0] + bw / 2, cy = box[1] + bh / 2;
      using (var sq = new Bitmap(side, side, PixelFormat.Format32bppPArgb)) {
        using (var g = Graphics.FromImage(sq)) { g.Clear(Color.Transparent); g.CompositingMode = CompositingMode.SourceCopy; g.DrawImage(full, new Rectangle(0, 0, side, side), cx - side / 2, cy - side / 2, side, side, GraphicsUnit.Pixel); }
        using (var small = Shrink(sq, n, n))
        using (var o = new Bitmap(n, n, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(o)) {
          g.Clear(Color.Transparent); g.SmoothingMode = SmoothingMode.AntiAlias;
          if (bg != "none") using (var br = new SolidBrush(ColorTranslator.FromHtml(bg))) RoundRect(g, br, 0, 0, n, n, (float)(radiusFrac * n));
          g.CompositingMode = CompositingMode.SourceOver; g.DrawImage(small, 0, 0, n, n);
          o.Save(dst, ImageFormat.Png);
        }
      }
    }
  }

  // Whole master at a given width (transparent), for documents and the web.
  public static void Scale(string src, int tw, string dst) {
    using (var full = new Bitmap(src)) { int th = (int)Math.Round((double)full.Height * tw / full.Width); using (var o = Shrink(full, tw, th)) using (var c = new Bitmap(o)) c.Save(dst, ImageFormat.Png); }
  }

  // ---------- Step 3 (proposals, owner review): the light-paper "ink" variant ----------
  // The glow is light, so on paper it inverts: white-hot cores of the bolts become the ink line, the glow a faint tint.
  // Hue follows the mark (Coral on the left to a deep Amber on the right). The waveform (an ellipse around the centre)
  // is solid colour in the original, so there the ink follows luminance instead of whiteness.
  public static void Ink(string src, string dst, string c0, string c1, double tint) {
    int w, h; var a = Load(src, out w, out h); var o = new byte[a.Length];
    var A = ColorTranslator.FromHtml(c0); var B = ColorTranslator.FromHtml(c1);
    double sx = w / 4844.0, sy = h / 3468.0; // ellipse in master coordinates
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      int k = (y * w + x) * 4; double al = a[k + 3] / 255.0; if (al == 0) continue;
      double ex = (x - 2470 * sx) / (700 * sx), ey = (y - 1770 * sy) / (620 * sy); bool wave = ex * ex + ey * ey <= 1;
      double L = wave ? (0.2126 * a[k + 2] + 0.7152 * a[k + 1] + 0.0722 * a[k]) / 255.0 : Math.Min(a[k + 2], Math.Min(a[k + 1], a[k])) / 255.0;
      double lo = wave ? 0.35 : 0.25, hi = wave ? 0.8 : 0.6;
      double t = (al * L - lo) / (hi - lo); t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t); double d = Math.Max(t, tint * al);
      double u = (x - 1200.0 * sx) / (2400.0 * sx); u = u < 0 ? 0 : u > 1 ? 1 : u;
      o[k + 2] = (byte)(A.R + (B.R - A.R) * u); o[k + 1] = (byte)(A.G + (B.G - A.G) * u); o[k] = (byte)(A.B + (B.B - A.B) * u); o[k + 3] = (byte)Math.Round(d * 255);
    }
    Save(o, w, h, dst);
  }

  // ---------- Step 3 (proposals, owner review): reduced-detail small icons, drawn, not traced ----------
  // Geometry in symbol units: the mark is 1.4 wide and 1.0 tall, centred on (0,0). Tips at (+-0.7, 0) and (0, +-0.49);
  // the inner vertices at (+-0.369, 0); the sides bow slightly towards the centre, as in the original.
  // variant: "outline" (S1: the two brackets as clean strokes plus three bars), "wave" (S2: five bars only),
  //          "solid" (S3: the filled rift star with three bars cut out).
  // style: "color" (Coral/Amber on a Void tile when tile = true) or "mono" (white, transparent: the notification badge).
  public static void Reduced(string variant, int n, bool tile, string style, string dst) {
    int ss = 8, N = n * ss; // supersample
    using (var big = new Bitmap(N, N, PixelFormat.Format32bppPArgb)) {
      using (var g = Graphics.FromImage(big)) {
        g.Clear(Color.Transparent); g.SmoothingMode = SmoothingMode.AntiAlias; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        bool mono = style == "mono";
        Color coral = ColorTranslator.FromHtml("#FF586B"), amber = ColorTranslator.FromHtml("#FFCB69"), vd = ColorTranslator.FromHtml("#0B0D12"), white = Color.White;
        if (tile && !mono) using (var br = new SolidBrush(vd)) RoundRect(g, br, 0, 0, N, N, N * 0.22f);
        // pixel sizes at the final size, so small icons get heavier lines (hinting by hand)
        float px = ss; double stroke = n <= 16 ? 1.5 : n <= 32 ? 2.2 : n <= 48 ? 2.8 : n * 0.045;
        double bar = n <= 16 ? 1.6 : n <= 32 ? 2.6 : n <= 48 ? 3.4 : n * 0.06;
        double fill = tile ? 0.86 : 0.94; // share of the side the mark spans
        if (variant == "wave") fill = tile ? 0.8 : 0.96;
        double S = N * fill / 1.4; float cx = N / 2f, cy = N / 2f;
        Func<double, double, PointF> P = (x, y) => new PointF((float)(cx + x * S), (float)(cy + y * S));
        var grad = new LinearGradientBrush(new PointF(cx - (float)(0.7 * S), 0), new PointF(cx + (float)(0.7 * S), 0), mono ? white : coral, mono ? white : amber);
        double vx = 0.369, ty = 0.49, tx = 0.7;
        if (variant == "outline") {
          float sw = (float)(stroke * px);
          for (int side = -1; side <= 1; side += 2) {
            var col = mono ? white : (side < 0 ? coral : amber);
            using (var pen = new Pen(col, sw) { LineJoin = LineJoin.Round, StartCap = LineCap.Round, EndCap = LineCap.Round })
            using (var p = new GraphicsPath()) {
              p.AddBezier(P(0.004 * side, -ty), P(0.10 * side, -0.33), P(side * 0.25, -0.13), P(side * vx, 0));
              p.AddBezier(P(side * vx, 0), P(side * 0.25, 0.13), P(0.10 * side, 0.33), P(0.004 * side, ty));
              g.DrawPath(pen, p);
            }
            // the spike: a tapered wedge from the vertex to the tip
            using (var br = new SolidBrush(col)) {
              double hw = stroke * px / S * 0.95;
              g.FillPolygon(br, new[] { P(side * (vx - 0.02), -hw), P(side * tx, 0), P(side * (vx - 0.02), hw) });
            }
          }
          Bars(g, grad, P, S, px, bar, n, 3, 0.5);
        } else if (variant == "solid") {
          using (var p = new GraphicsPath()) {
            double sp = Math.Max(0.035, stroke * px / S * 0.9); // spike half-width at the vertex
            p.AddBezier(P(0, -ty), P(-0.10, -0.33), P(-0.25, -0.13), P(-vx, -sp));
            p.AddLine(P(-vx, -sp), P(-tx, 0)); p.AddLine(P(-tx, 0), P(-vx, sp));
            p.AddBezier(P(-vx, sp), P(-0.25, 0.13), P(-0.10, 0.33), P(0, ty));
            p.AddBezier(P(0, ty), P(0.10, 0.33), P(0.25, 0.13), P(vx, sp));
            p.AddLine(P(vx, sp), P(tx, 0)); p.AddLine(P(tx, 0), P(vx, -sp));
            p.AddBezier(P(vx, -sp), P(0.25, -0.13), P(0.10, -0.33), P(0, -ty));
            p.CloseFigure(); g.FillPath(grad, p);
          }
          // the waveform is cut out of the star (transparent in mono, Void on the tile)
          var old = g.CompositingMode;
          if (mono || !tile) g.CompositingMode = CompositingMode.SourceCopy;
          using (var cut = new SolidBrush(mono || !tile ? Color.Transparent : vd)) Bars(g, cut, P, S, px, bar * 0.85, n, 3, 0.4);
          g.CompositingMode = old;
        } else { // wave
          Bars(g, grad, P, S, px, n <= 16 ? 2 : n * 0.085, n, n <= 16 ? 3 : 5, 0.95);
        }
        grad.Dispose();
      }
      using (var o = Shrink(big, n, n)) using (var c = new Bitmap(o)) c.Save(dst, ImageFormat.Png);
    }
  }
  // Rounded bars centred on (0,0): count 3 or 5, the centre bar `h` tall (symbol units), the others shorter, as in the original.
  static void Bars(Graphics g, Brush b, Func<double, double, PointF> P, double S, float px, double barPx, int n, int count, double h) {
    double[] hs = count == 5 ? new[] { 0.42, 0.72, 1.0, 0.72, 0.42 } : new[] { 0.55, 1.0, 0.55 };
    float bw = (float)(barPx * px); float gap = bw * (count == 5 ? 0.9f : 1.0f);
    float total = count * bw + (count - 1) * gap; var c = P(0, 0); float x = c.X - total / 2;
    for (int i = 0; i < count; i++) {
      float bh = (float)(h * hs[i] * S); if (bh < bw) bh = bw;
      RoundRect(g, b, x, c.Y - bh / 2, bw, bh, bw / 2); x += bw + gap;
    }
  }

  // ---------- favicon.ico with PNG entries (Windows Vista+ and every current browser) ----------
  public static void Ico(string[] pngs, string dst) {
    var data = new List<byte[]>(); foreach (var p in pngs) data.Add(File.ReadAllBytes(p));
    using (var fs = new FileStream(dst, FileMode.Create)) using (var w = new BinaryWriter(fs)) {
      w.Write((short)0); w.Write((short)1); w.Write((short)data.Count); int off = 6 + 16 * data.Count;
      for (int i = 0; i < data.Count; i++) {
        int sz; using (var b = new Bitmap(pngs[i])) sz = b.Width;
        w.Write((byte)(sz >= 256 ? 0 : sz)); w.Write((byte)(sz >= 256 ? 0 : sz)); w.Write((byte)0); w.Write((byte)0);
        w.Write((short)1); w.Write((short)32); w.Write(data[i].Length); w.Write(off); off += data[i].Length;
      }
      foreach (var d in data) w.Write(d);
    }
  }
}
