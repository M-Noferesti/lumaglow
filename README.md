# LumaGlow CEP

A Photoshop CEP panel with live editable glow controls. It creates a separate group containing three native Gaussian Blur passes, each set to Screen blend mode. The source layer remains intact. Select the generated LumaGlow group to restore its settings, then move the sliders to rebuild it.

## Install for development on Windows

1. Extract the ZIP. Right-click `install-windows.ps1` and run it with PowerShell. The script copies the extension into your user CEP folder and enables unsigned extension debug mode for CEP 12.
2. Restart Photoshop. Open **Window → Extensions (Legacy) → LumaGlow CEP**.

For manual installation, copy the entire `LumaGlow-CEP` folder to `%APPDATA%\Adobe\CEP\extensions\`. Because this source extension is unsigned, create a **String Value** named `PlayerDebugMode` with value `1` under `HKEY_CURRENT_USER\Software\Adobe\CSXS.12` for Photoshop versions using CEP 12 (25.12 and newer). For versions using CEP 11, use `CSXS.11` instead.

On macOS, place the folder in `~/Library/Application Support/Adobe/CEP/extensions/` and enable `PlayerDebugMode` for the corresponding CSXS version. Adobe's CEP documentation describes the unsigned development workflow.

## Use

Select a pixel, text, shape, or smart object layer in an RGB document. Click **Create glow**. Changes to the sliders update the generated group after a short pause. Select the group later to edit it again. Use **Refresh** after changing the source. The generated layers can be inspected and adjusted manually in Photoshop.

## Limits

- This is CEP source, not a signed `.zxp` installer. A signed ZXP requires Adobe's packaging/signing workflow.
- The glow uses Photoshop's Levels, Gaussian Blur, Photo Filter, and Screen blend mode, so it is a native layered approximation rather than a pixel-identical port of another product.
- Each control update replaces the previous generated group. Manual edits inside that group are replaced on the next update.
- The source must be a non-background art layer. RGB documents are supported.
- Host behavior still needs a Photoshop smoke test.
