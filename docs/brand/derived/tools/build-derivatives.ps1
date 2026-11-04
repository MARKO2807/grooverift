# GrooveRift brand derivatives (step 3.7). Built-in Windows PowerShell + .NET only (D-029); no third-party tools.
# Usage (from the repo root):  powershell -NoProfile -File docs/brand/derived/tools/build-derivatives.ps1
# The originals in docs/brand/source/ are only read. Their SHA-256 is checked before and after the run.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$src = Join-Path $root 'docs\brand\source\grooverift-symbol-original.png'
$out = Join-Path $root 'docs\brand\derived'
$expected = 'd0532e9c0405c2d6a14fea7520d3788210d280ab9d852129f1d8f2dec37d3a1d'
function Sha($p) { (Get-FileHash -Algorithm SHA256 $p).Hash.ToLower() }
if ((Sha $src) -ne $expected) { throw "Source PNG hash mismatch: the original has changed." }

Add-Type -Path (Join-Path $PSScriptRoot 'Brand.cs') -ReferencedAssemblies System.Drawing
foreach ($d in 'master', 'icons', 'proposals\small-icon', 'proposals\badge', 'proposals\light') { New-Item -ItemType Directory -Force (Join-Path $out $d) | Out-Null }

# 1. Cleaned master: same canvas (4844 x 3468), same silhouette.
$master = Join-Path $out 'master\grooverift-symbol-clean.png'
"clean: " + [Brand]::Clean($src, $master, 8, 2000)
$changed = [Brand]::Diff($src, $master, 64)
if ($changed -ne 0) { throw "Cleanup touched $changed pixels with alpha >= 64 (the silhouette)." }
"silhouette check: 0 pixels with alpha >= 64 changed"
$box = [Brand]::Bounds($master, 64)
"visible bounds (alpha >= 64): $($box -join ',')"
foreach ($w in 2048, 1024, 512) { [Brand]::Scale($master, $w, (Join-Path $out "master\grooverift-symbol-clean-$w.png")) }

# 2. Technical icons from the full-detail mark on Void Black (#0B0D12).
#    favicon 16/32/48 (rounded tile), apple-touch 180 (square; iOS rounds it), PWA "any" 192/512 (rounded tile),
#    PWA "maskable" 192/512 (full bleed; the mark's tips stay inside the 80 % safe circle).
$I = Join-Path $out 'icons'
foreach ($n in 16, 32, 48) { [Brand]::Icon($master, $box, $n, 0.92, '#0B0D12', 0.22, "$I\favicon-full-$n.png") }
[Brand]::Icon($master, $box, 180, 0.80, '#0B0D12', 0, "$I\apple-touch-icon-180.png")
foreach ($n in 192, 512) { [Brand]::Icon($master, $box, $n, 0.84, '#0B0D12', 0.22, "$I\icon-$n.png") }
foreach ($n in 192, 512) { [Brand]::Icon($master, $box, $n, 0.76, '#0B0D12', 0, "$I\icon-maskable-$n.png") }

# 3. Proposals for owner review (D-006): reduced-detail small icons, monochrome badge, light-paper variant.
$P = Join-Path $out 'proposals'
foreach ($v in 'outline', 'wave', 'solid') {
  foreach ($n in 16, 32, 48, 64) { [Brand]::Reduced($v, $n, $true, 'color', "$P\small-icon\$v-$n.png") }
  [Brand]::Reduced($v, 96, $false, 'mono', "$P\badge\$v-mono-96.png")
  [Brand]::Reduced($v, 24, $false, 'mono', "$P\badge\$v-mono-24.png")
}
# light paper: Coral to a deep Amber (#B87A12, 3.4:1 on white; Amber itself is 1.5:1)
$ink = "$P\light\grooverift-symbol-ink.png"
[Brand]::Ink($master, $ink, '#FF586B', '#B87A12', 0.08)
foreach ($w in 1024, 512) { [Brand]::Scale($ink, $w, "$P\light\grooverift-symbol-ink-$w.png") }
foreach ($n in 64, 192) { [Brand]::Icon($master, $box, $n, 0.84, '#0B0D12', 0.22, "$P\light\tile-$n.png") }

if ((Sha $src) -ne $expected) { throw "Source PNG hash changed during the run." }
"source SHA-256 re-verified: $expected"
