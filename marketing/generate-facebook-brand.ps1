Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot "assets"
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$source = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;

public static class QRShopBrandArt
{
    static Color C(string value) => ColorTranslator.FromHtml(value);

    static GraphicsPath Rounded(float x, float y, float w, float h, float r)
    {
        var p = new GraphicsPath();
        float d = r * 2;
        p.AddArc(x, y, d, d, 180, 90);
        p.AddArc(x + w - d, y, d, d, 270, 90);
        p.AddArc(x + w - d, y + h - d, d, d, 0, 90);
        p.AddArc(x, y + h - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    static void FillRound(Graphics g, Brush b, float x, float y, float w, float h, float r)
    {
        using (var p = Rounded(x, y, w, h, r)) g.FillPath(b, p);
    }

    static void StrokeRound(Graphics g, Pen pen, float x, float y, float w, float h, float r)
    {
        using (var p = Rounded(x, y, w, h, r)) g.DrawPath(pen, p);
    }

    static Font Font(float size, FontStyle style = FontStyle.Regular)
    {
        return new Font("Tahoma", size, style, GraphicsUnit.Pixel);
    }

    public static void MakeProfile(string path)
    {
        using (var bmp = new Bitmap(1024, 1024))
        using (var g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.Clear(C("#0B0D12"));
            using (var glow = new LinearGradientBrush(new Rectangle(90, 90, 844, 844), C("#1E3346"), C("#111820"), 45f))
                g.FillEllipse(glow, 90, 90, 844, 844);
            using (var outer = new Pen(C("#E0A33D"), 18f)) g.DrawEllipse(outer, 126, 126, 772, 772);
            using (var inner = new Pen(C("#3D8BE0"), 9f)) g.DrawEllipse(inner, 155, 155, 714, 714);

            // Four rounded scan brackets frame the mark.
            using (var gold = new Pen(C("#E0A33D"), 24f))
            {
                gold.StartCap = LineCap.Round; gold.EndCap = LineCap.Round;
                g.DrawLine(gold, 276, 345, 276, 270); g.DrawLine(gold, 276, 270, 350, 270);
                g.DrawLine(gold, 674, 270, 748, 270); g.DrawLine(gold, 748, 270, 748, 345);
                g.DrawLine(gold, 276, 679, 276, 754); g.DrawLine(gold, 276, 754, 350, 754);
                g.DrawLine(gold, 674, 754, 748, 754); g.DrawLine(gold, 748, 754, 748, 679);
            }

            using (var f = Font(430, FontStyle.Bold))
            using (var brush = new SolidBrush(C("#F5F1E8")))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                g.DrawString("Q", f, brush, new RectangleF(265, 263, 494, 494), sf);
            using (var tail = new Pen(C("#E0A33D"), 36f))
            {
                tail.StartCap = LineCap.Round; tail.EndCap = LineCap.Round;
                g.DrawLine(tail, 590, 603, 695, 708);
            }
            bmp.Save(path, System.Drawing.Imaging.ImageFormat.Png);
        }
    }

    public static void MakeCover(string path)
    {
        const int w = 1640, h = 624;
        using (var bmp = new Bitmap(w, h))
        using (var g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.Clear(C("#0B0D12"));
            using (var bg = new LinearGradientBrush(new Rectangle(0, 0, w, h), C("#111923"), C("#19283A"), 0f))
                g.FillRectangle(bg, 0, 0, w, h);
            using (var glow = new SolidBrush(Color.FromArgb(30, 224, 163, 61))) g.FillEllipse(glow, -140, -280, 760, 760);
            using (var glow = new SolidBrush(Color.FromArgb(34, 61, 139, 224))) g.FillEllipse(glow, 1110, -250, 720, 720);

            // Brand name and benefit-led copy.
            using (var f = Font(44, FontStyle.Bold))
            using (var gold = new SolidBrush(C("#E0A33D")))
                g.DrawString("QR ร้าน", f, gold, new PointF(100, 66));
            using (var f = Font(62, FontStyle.Bold))
            using (var white = new SolidBrush(C("#F5F1E8")))
                g.DrawString("ร้านคล่องขึ้น", f, white, new PointF(100, 145));
            using (var f = Font(62, FontStyle.Bold))
            using (var white = new SolidBrush(C("#F5F1E8")))
                g.DrawString("ลูกค้าสั่งง่ายขึ้น", f, white, new PointF(100, 224));
            using (var f = Font(31))
            using (var muted = new SolidBrush(C("#C6D0DA")))
                g.DrawString("สแกน QR • ออเดอร์เข้าครัวทันที", f, muted, new PointF(104, 333));

            using (var gold = new SolidBrush(C("#E0A33D"))) FillRound(g, gold, 100, 410, 388, 78, 26);
            using (var f = Font(30, FontStyle.Bold))
            using (var ink = new SolidBrush(C("#11151C")))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                g.DrawString("ทดลองใช้ฟรี 3 เดือน", f, ink, new RectangleF(100, 410, 388, 78), sf);
            using (var f = Font(23))
            using (var muted = new SolidBrush(C("#AAB7C5")))
                g.DrawString("ร้านตามสั่งและบุฟเฟต์", f, muted, new PointF(104, 520));

            // Restaurant table, phone ordering UI, and kitchen ticket.
            using (var table = new SolidBrush(C("#253342"))) FillRound(g, table, 820, 462, 695, 32, 16);
            using (var tableLeg = new Pen(C("#34485B"), 18f))
            {
                tableLeg.StartCap = LineCap.Round; tableLeg.EndCap = LineCap.Round;
                g.DrawLine(tableLeg, 930, 488, 900, 585); g.DrawLine(tableLeg, 1395, 488, 1425, 585);
            }
            using (var frame = new SolidBrush(C("#E0A33D"))) FillRound(g, frame, 1000, 46, 280, 485, 40);
            using (var screen = new SolidBrush(C("#111923"))) FillRound(g, screen, 1012, 59, 256, 459, 31);
            using (var f = Font(22, FontStyle.Bold))
            using (var white = new SolidBrush(C("#F5F1E8")))
                g.DrawString("เมนูของร้าน", f, white, new PointF(1040, 91));
            using (var blue = new SolidBrush(C("#3D8BE0"))) FillRound(g, blue, 1040, 137, 200, 76, 16);
            using (var f = Font(21, FontStyle.Bold))
            using (var white = new SolidBrush(C("#FFFFFF")))
                g.DrawString("สั่งอาหารผ่าน QR", f, white, new PointF(1055, 162));
            for (int i = 0; i < 3; i++)
            {
                int y = 235 + i * 73;
                using (var row = new SolidBrush(C("#202C39"))) FillRound(g, row, 1038, y, 204, 58, 12);
                using (var icon = new SolidBrush(i == 0 ? C("#E0A33D") : C("#3D8BE0"))) g.FillEllipse(icon, 1050, y + 12, 34, 34);
                using (var line = new SolidBrush(C("#CFD8E2"))) FillRound(g, line, 1096, y + 13, 112, 8, 4);
                using (var line = new SolidBrush(C("#8292A3"))) FillRound(g, line, 1096, y + 31, 78, 6, 3);
            }
            using (var gold = new SolidBrush(C("#E0A33D"))) FillRound(g, gold, 1040, 466, 200, 30, 12);

            using (var ticket = new SolidBrush(C("#F5F1E8"))) FillRound(g, ticket, 1300, 157, 245, 246, 20);
            using (var f = Font(25, FontStyle.Bold))
            using (var ink = new SolidBrush(C("#17212D")))
                g.DrawString("ออเดอร์ใหม่", f, ink, new PointF(1326, 183));
            using (var blue = new SolidBrush(C("#3D8BE0"))) FillRound(g, blue, 1324, 234, 194, 6, 3);
            for (int i = 0; i < 3; i++)
            {
                int y = 260 + i * 40;
                using (var ink = new SolidBrush(C("#314254"))) FillRound(g, ink, 1324, y, 176 - i * 18, 8, 4);
            }
            using (var gold = new SolidBrush(C("#E0A33D"))) FillRound(g, gold, 1324, 367, 118, 16, 8);
            bmp.Save(path, System.Drawing.Imaging.ImageFormat.Png);
        }
    }
}
'@

$drawingReferences = @(
    [System.Drawing.Bitmap].Assembly.Location,
    [System.Drawing.Color].Assembly.Location,
    (Join-Path $PSHOME "System.Private.Windows.GdiPlus.dll"),
    (Join-Path $PSHOME "System.Private.Windows.Core.dll")
)
Add-Type -TypeDefinition $source -ReferencedAssemblies $drawingReferences
[QRShopBrandArt]::MakeProfile((Join-Path $outputDirectory "qr-store-facebook-profile.png"))
[QRShopBrandArt]::MakeCover((Join-Path $outputDirectory "qr-store-facebook-cover.png"))
Get-ChildItem $outputDirectory -Filter "qr-store-facebook-*.png" | Select-Object FullName, Length
