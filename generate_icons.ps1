param(
    [string]$OutputDir = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param(
        [double]$X,
        [double]$Y,
        [double]$Width,
        [double]$Height,
        [double]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = [Math]::Min($Radius * 2, [Math]::Min($Width, $Height))

    if ($diameter -le 0.1) {
        $path.AddRectangle([System.Drawing.RectangleF]::new([float]$X, [float]$Y, [float]$Width, [float]$Height))
        return $path
    }

    $arc = [float]$diameter
    $right = [float]($X + $Width - $diameter)
    $bottom = [float]($Y + $Height - $diameter)

    $path.AddArc([float]$X, [float]$Y, $arc, $arc, 180, 90)
    $path.AddArc($right, [float]$Y, $arc, $arc, 270, 90)
    $path.AddArc($right, $bottom, $arc, $arc, 0, 90)
    $path.AddArc([float]$X, $bottom, $arc, $arc, 90, 90)
    $path.CloseFigure()
    return $path
}

function Add-PathFigure {
    param(
        [System.Drawing.Drawing2D.GraphicsPath]$Target,
        [System.Drawing.Drawing2D.GraphicsPath]$Source
    )

    $Target.AddPath($Source, $false)
    $Source.Dispose()
}

function New-ClipboardPath {
    param(
        [double]$Size,
        [hashtable]$Profile
    )

    $bodyX = $Size * $Profile.BodyX
    $bodyY = $Size * $Profile.BodyY
    $bodyWidth = $Size * $Profile.BodyWidth
    $bodyHeight = $Size * $Profile.BodyHeight
    $bodyRadius = $Size * $Profile.BodyRadius

    $tabWidth = $Size * $Profile.TabWidth
    $tabHeight = $Size * $Profile.TabHeight
    $tabX = ($Size - $tabWidth) / 2
    $tabY = $Size * $Profile.TabY
    $tabRadius = $Size * $Profile.TabRadius

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-PathFigure -Target $path -Source (New-RoundedRectPath -X $bodyX -Y $bodyY -Width $bodyWidth -Height $bodyHeight -Radius $bodyRadius)
    Add-PathFigure -Target $path -Source (New-RoundedRectPath -X $tabX -Y $tabY -Width $tabWidth -Height $tabHeight -Radius $tabRadius)
    return $path
}

function New-ChainLinkPath {
    param(
        [double]$CenterX,
        [double]$CenterY,
        [double]$Width,
        [double]$Height,
        [double]$Radius,
        [double]$Rotation,
        [double]$OffsetX,
        [double]$OffsetY
    )

    $path = New-RoundedRectPath -X ($CenterX - ($Width / 2)) -Y ($CenterY - ($Height / 2)) -Width $Width -Height $Height -Radius $Radius
    $matrix = New-Object System.Drawing.Drawing2D.Matrix
    $matrix.Translate([float]$OffsetX, [float]$OffsetY)
    $matrix.RotateAt([float]$Rotation, [System.Drawing.PointF]::new([float]$CenterX, [float]$CenterY))
    $path.Transform($matrix)
    $matrix.Dispose()
    return $path
}

function Draw-OutlinedPath {
    param(
        [System.Drawing.Graphics]$Graphics,
        [System.Drawing.Drawing2D.GraphicsPath]$Path,
        [double]$OuterWidth,
        [System.Drawing.Color]$OuterColor,
        [double]$InnerWidth,
        [System.Drawing.Color]$InnerColor
    )

    $outerPen = New-Object System.Drawing.Pen($OuterColor, [float]$OuterWidth)
    $outerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $outerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $outerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $innerPen = New-Object System.Drawing.Pen($InnerColor, [float]$InnerWidth)
    $innerPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $innerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $innerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    try {
        $Graphics.DrawPath($outerPen, $Path)
        $Graphics.DrawPath($innerPen, $Path)
    }
    finally {
        $outerPen.Dispose()
        $innerPen.Dispose()
    }
}

function Draw-Icon {
    param(
        [int]$Size,
        [string]$FileName,
        [string]$Kind
    )

    $profile = if ($Kind -eq 'action') {
        @{
            BodyX = 0.14
            BodyY = 0.24
            BodyWidth = 0.72
            BodyHeight = 0.60
            BodyRadius = 0.15
            TabWidth = 0.28
            TabHeight = 0.10
            TabY = 0.12
            TabRadius = 0.07
            BodyOuterStroke = 0.17
            BodyInnerStroke = 0.09
            LinkOuterStroke = 0.20
            LinkInnerStroke = 0.11
            LinkWidth = 0.30
            LinkHeight = 0.18
            LinkRadius = 0.085
            LinkOffsetX = 0.095
            LinkOffsetY = 0.030
        }
    }
    else {
        @{
            BodyX = 0.18
            BodyY = 0.29
            BodyWidth = 0.64
            BodyHeight = 0.50
            BodyRadius = 0.13
            TabWidth = 0.24
            TabHeight = 0.08
            TabY = 0.19
            TabRadius = 0.05
            BodyOuterStroke = 0.135
            BodyInnerStroke = 0.072
            LinkOuterStroke = 0.155
            LinkInnerStroke = 0.085
            LinkWidth = 0.25
            LinkHeight = 0.145
            LinkRadius = 0.070
            LinkOffsetX = 0.078
            LinkOffsetY = 0.022
        }
    }

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.Clear([System.Drawing.Color]::Transparent)

            $bodyOuterStroke = [Math]::Max(1.8, $Size * $profile.BodyOuterStroke)
            $bodyInnerStroke = [Math]::Max(1.0, $Size * $profile.BodyInnerStroke)
            $linkOuterStroke = [Math]::Max(1.8, $Size * $profile.LinkOuterStroke)
            $linkInnerStroke = [Math]::Max(1.0, $Size * $profile.LinkInnerStroke)
            $linkWidth = $Size * $profile.LinkWidth
            $linkHeight = $Size * $profile.LinkHeight
            $linkRadius = $Size * $profile.LinkRadius
            $centerX = $Size * 0.50
            $centerY = $Size * 0.50
            $linkOffsetX = $Size * $profile.LinkOffsetX
            $linkOffsetY = $Size * $profile.LinkOffsetY
            $rotation = -32

            $clipboardPath = New-ClipboardPath -Size $Size -Profile $profile
            try {
                Draw-OutlinedPath -Graphics $graphics -Path $clipboardPath -OuterWidth $bodyOuterStroke -OuterColor ([System.Drawing.Color]::White) -InnerWidth $bodyInnerStroke -InnerColor ([System.Drawing.Color]::FromArgb(255, 12, 12, 12))
            }
            finally {
                $clipboardPath.Dispose()
            }

            $leftLink = New-ChainLinkPath -CenterX $centerX -CenterY $centerY -Width $linkWidth -Height $linkHeight -Radius $linkRadius -Rotation $rotation -OffsetX (-$linkOffsetX) -OffsetY (-$linkOffsetY)
            $rightLink = New-ChainLinkPath -CenterX $centerX -CenterY $centerY -Width $linkWidth -Height $linkHeight -Radius $linkRadius -Rotation $rotation -OffsetX $linkOffsetX -OffsetY $linkOffsetY

            try {
                Draw-OutlinedPath -Graphics $graphics -Path $leftLink -OuterWidth $linkOuterStroke -OuterColor ([System.Drawing.Color]::White) -InnerWidth $linkInnerStroke -InnerColor ([System.Drawing.Color]::FromArgb(255, 12, 12, 12))
                Draw-OutlinedPath -Graphics $graphics -Path $rightLink -OuterWidth $linkOuterStroke -OuterColor ([System.Drawing.Color]::White) -InnerWidth $linkInnerStroke -InnerColor ([System.Drawing.Color]::FromArgb(255, 12, 12, 12))
            }
            finally {
                $leftLink.Dispose()
                $rightLink.Dispose()
            }

            $outputPath = Join-Path $OutputDir $FileName
            $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Host "Generated $outputPath"
        }
        finally {
            $graphics.Dispose()
        }
    }
    finally {
        $bitmap.Dispose()
    }
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$targets = @(
    @{ Size = 16; FileName = "icon16.png"; Kind = "store" },
    @{ Size = 32; FileName = "icon32.png"; Kind = "store" },
    @{ Size = 48; FileName = "icon48.png"; Kind = "store" },
    @{ Size = 128; FileName = "icon128.png"; Kind = "store" },
    @{ Size = 1024; FileName = "icon.png"; Kind = "store" },
    @{ Size = 16; FileName = "action-16.png"; Kind = "action" },
    @{ Size = 24; FileName = "action-24.png"; Kind = "action" },
    @{ Size = 32; FileName = "action-32.png"; Kind = "action" },
    @{ Size = 48; FileName = "action-48.png"; Kind = "action" }
)

foreach ($target in $targets) {
    Draw-Icon -Size $target.Size -FileName $target.FileName -Kind $target.Kind
}