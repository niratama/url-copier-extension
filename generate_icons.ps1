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
        [double]$Size
    )

    $bodyX = $Size * 0.12
    $bodyY = $Size * 0.23
    $bodyWidth = $Size * 0.76
    $bodyHeight = $Size * 0.64
    $bodyRadius = $Size * 0.16

    $tabWidth = $Size * 0.32
    $tabHeight = $Size * 0.12
    $tabX = ($Size - $tabWidth) / 2
    $tabY = $Size * 0.11
    $tabRadius = $Size * 0.08

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
        [string]$FileName
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.Clear([System.Drawing.Color]::Transparent)

            $bodyOuterStroke = [Math]::Max(2.2, $Size * 0.17)
            $bodyInnerStroke = [Math]::Max(1.2, $Size * 0.09)
            $linkOuterStroke = [Math]::Max(2.4, $Size * 0.20)
            $linkInnerStroke = [Math]::Max(1.3, $Size * 0.11)
            $linkWidth = $Size * 0.30
            $linkHeight = $Size * 0.18
            $linkRadius = $Size * 0.085
            $centerX = $Size * 0.50
            $centerY = $Size * 0.50
            $linkOffsetX = $Size * 0.095
            $linkOffsetY = $Size * 0.030
            $rotation = -32

            $clipboardPath = New-ClipboardPath -Size $Size
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
    @{ Size = 16; FileName = "icon16.png" },
    @{ Size = 48; FileName = "icon48.png" },
    @{ Size = 128; FileName = "icon128.png" },
    @{ Size = 1024; FileName = "icon.png" },
    @{ Size = 16; FileName = "action-16.png" },
    @{ Size = 32; FileName = "action-32.png" }
)

foreach ($target in $targets) {
    Draw-Icon -Size $target.Size -FileName $target.FileName
}