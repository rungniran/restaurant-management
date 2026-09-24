Add-Type -AssemblyName System.Drawing

$outputPath = Join-Path $PSScriptRoot "../frontend/staff/public/qr-store-seo.png"
$outputPath = [System.IO.Path]::GetFullPath($outputPath)
New-Item -ItemType Directory -Path (Split-Path $outputPath) -Force | Out-Null

$source = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;

public static class QRShopSeoImage
{
    static Color C(string value) => ColorTranslator.FromHtml(value);
    static Font F(float size, FontStyle style = FontStyle.Regular) => new Font("Tahoma", size, style, GraphicsUnit.Pixel);

    static void Round(Graphics g, Color color, float x, float y, float w, float h, float radius)
    {
        using (var path = new GraphicsPath())
        {
            float d = radius * 2;
            path.AddArc(x, y, d, d, 180, 90);
            path.AddArc(x + w - d, y, d, d, 270, 90);
            path.AddArc(x + w - d, y + h - d, d, d, 0, 90);
            path.AddArc(x, y + h - d, d, d, 90, 90);
            path.CloseFigure();
            using (var brush = new SolidBrush(color)) g.FillPath(brush, path);
        }
    }

    public static void Make(string path)
    {
        const int w = 1200, h = 630;
        using (var bmp = new Bitmap(w, h))
        using (var g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.Clear(C("#0B0D12"));
            using (var bg = new LinearGradientBrush(new Rectangle(0, 0, w, h), C("#101721"), C("#1A2A3A"), 0f))
                g.FillRectangle(bg, 0, 0, w, h);
            using (var glow = new SolidBrush(Color.FromArgb(31, 224, 163, 61))) g.FillEllipse(glow, -190, -240, 650, 650);
            using (var glow = new SolidBrush(Color.FromArgb(40, 61, 139, 224))) g.FillEllipse(glow, 760, -220, 620, 620);

            // Brand title and readable search/social headline.
            using (var f = F(32, FontStyle.Bold))
            using (var gold = new SolidBrush(C("#E0A33D"))) g.DrawString("QR ร้าน", f, gold, new PointF(76, 58));
            using (var f = F(55, FontStyle.Bold))
            using (var white = new SolidBrush(C("#F5F1E8"))) g.DrawString("รับออเดอร์เป็นระบบ", f, white, new PointF(74, 145));
            using (var f = F(47, FontStyle.Bold))
            using (var white = new SolidBrush(C("#F5F1E8"))) g.DrawString("ดูแลร้านได้ง่ายขึ้น", f, white, new PointF(78, 220));
            using (var f = F(25))
            using (var muted = new SolidBrush(C("#C6D0DA"))) g.DrawString("สแกน QR • ออเดอร์เข้าครัวแบบเรียลไทม์", f, muted, new PointF(82, 310));

            Round(g, C("#E0A33D"), 80, 380, 310, 66, 20);
            using (var f = F(25, FontStyle.Bold))
            using (var ink = new SolidBrush(C("#11151C")))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                g.DrawString("ทดลองใช้ฟรี 3 เดือน", f, ink, new RectangleF(80, 380, 310, 66), sf);
            using (var f = F(21))
            using (var muted = new SolidBrush(C("#AAB7C5"))) g.DrawString("ร้านตามสั่งและบุฟเฟต์", f, muted, new PointF(84, 480));

            // Order-by-QR illustration: phone, table code and kitchen ticket.
            Round(g, C("#E0A33D"), 645, 72, 255, 452, 36);
            Round(g, C("#101721"), 657, 84, 231, 428, 28);
            using (var f = F(21, FontStyle.Bold))
            using (var white = new SolidBrush(C("#F5F1E8"))) g.DrawString("เมนูของร้าน", f, white, new PointF(683, 113));
            Round(g, C("#285D91"), 681, 155, 184, 62, 14);
            using (var f = F(18, FontStyle.Bold))
            using (var white = new SolidBrush(Color.White)) g.DrawString("สั่งอาหารผ่าน QR", f, white, new PointF(696, 176));
            for (int i = 0; i < 3; i++)
            {
                int y = 239 + i * 62;
                Round(g, C("#202C39"), 680, y, 186, 49, 12);
                using (var icon = new SolidBrush(i == 0 ? C("#E0A33D") : C("#3D8BE0"))) g.FillEllipse(icon, 692, y + 10, 30, 30);
                Round(g, C("#CFD8E2"), 735, y + 13, 112, 7, 3);
                Round(g, C("#8292A3"), 735, y + 28, 78, 6, 3);
            }
            Round(g, C("#E0A33D"), 681, 442, 184, 29, 10);

            // Floating kitchen ticket with live order indicator.
            Round(g, Color.FromArgb(45, 0, 0, 0), 894, 195, 238, 207, 20);
            Round(g, C("#F5F1E8"), 882, 181, 238, 207, 20);
            using (var f = F(23, FontStyle.Bold))
            using (var ink = new SolidBrush(C("#17212D"))) g.DrawString("ออเดอร์ใหม่", f, ink, new PointF(906, 207));
            using (var green = new SolidBrush(C("#35A36C"))) g.FillEllipse(green, 1070, 215, 14, 14);
            Round(g, C("#3D8BE0"), 907, 251, 184, 6, 3);
            for (int i = 0; i < 3; i++) Round(g, C("#7C8995"), 907, 273 + i * 27, 165 - i * 18, 7, 3);
            Round(g, C("#E0A33D"), 907, 356, 100, 13, 6);

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
[QRShopSeoImage]::Make($outputPath)
Get-Item $outputPath | Select-Object FullName, Length
