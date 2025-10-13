# Screenshot Images Directory

This directory contains all screenshots and visual assets for the Find-n-Replace documentation.

---

## Directory Structure

Screenshots are organized by documentation section for easy maintenance:

```
images/
├── 01-getting-started/          # Getting Started section
│   ├── first-search.png
│   ├── understanding-results.png
│   └── first-replacement.png
├── 02-basic-features/           # Basic Features section
│   ├── file-filtering-panel.png
│   ├── search-options.png
│   ├── multi-selection.png
│   ├── replace-operations.png
│   └── help-modal.png
├── 03-advanced-features/        # Advanced Features section
│   ├── regex-preview.png
│   ├── multiline-search.png
│   ├── search-history.png
│   └── keyboard-shortcuts.png
├── 04-settings/                 # Settings Configuration section
│   ├── settings-overview.png
│   └── filter-defaults.png
├── 05-workflows/                # Real-world Workflows section
│   ├── workflow-*.png
│   └── ...
└── 06-tips-tricks/              # Tips and Tricks section
    └── ...
```

---

## Naming Convention

All screenshot files follow this consistent naming pattern:

```
{section}-{feature}-{variant}.png
```

### Components

**1. Section Prefix** (2 digits)
- `01` = Getting Started
- `02` = Basic Features
- `03` = Advanced Features
- `04` = Settings
- `05` = Workflows
- `06` = Tips & Tricks

**2. Feature Name** (descriptive-kebab-case)
- Use 2-4 words describing what's shown
- Be specific and searchable
- Use consistent terminology from docs
- Examples: `file-filtering-panel`, `regex-preview`, `search-history`

**3. Variant Suffix** (optional)
- `-light` = Light theme version
- `-dark` = Dark theme version
- `-before` / `-after` = Comparison states
- `-step1`, `-step2`, etc. = Sequential workflow steps
- `-annotated` = Version with annotations/callouts

### Naming Examples

```
# Basic screenshots
01-getting-started-first-search.png
02-basic-file-filtering-panel.png
03-advanced-regex-preview.png

# Theme variants
01-getting-started-first-search-light.png
01-getting-started-first-search-dark.png

# Before/After comparisons
05-workflow-tag-replacement-before.png
05-workflow-tag-replacement-after.png

# Step-by-step sequences
05-workflow-link-refactoring-step1.png
05-workflow-link-refactoring-step2.png
05-workflow-link-refactoring-step3.png

# Annotated versions
02-basic-search-options-annotated.png
03-advanced-multiline-search-annotated.png
```

---

## File Requirements

### Technical Specifications

**Format:** PNG (lossless compression)
- Maintains UI text clarity
- Supports transparency if needed
- Universally compatible

**Resolution:**
- **Minimum:** 1920x1080 pixels
- **Preferred:** 2560x1440 pixels (retina displays)
- **Capture:** 2x device pixel ratio when possible

**File Size:**
- **Full screenshots:** 200-500 KB (after optimization)
- **Cropped screenshots:** 50-150 KB (after optimization)
- Use `pngquant` or `ImageOptim` to compress without quality loss

### Content Guidelines

**DO:**
- ✅ Use default Obsidian theme (not custom themes)
- ✅ Show realistic, representative data
- ✅ Ensure all text is readable at 100% zoom
- ✅ Include appropriate padding around focus areas (20-40px)
- ✅ Capture complete UI elements (no cut-offs)
- ✅ Use consistent window sizes (1200-1400px width)

**DON'T:**
- ❌ Include personal or sensitive information
- ❌ Show error states without context
- ❌ Use Lorem Ipsum or meaningless placeholder text
- ❌ Capture during animations or transitions
- ❌ Include unrelated Obsidian UI or other plugins

---

## Creating Screenshots

### Quick Start

1. **Read the Style Guide**
   - See [`SCREENSHOT_GUIDE.md`](../SCREENSHOT_GUIDE.md) for complete guidelines
   - Follow technical specifications and annotation standards

2. **Prepare Environment**
   - Set Obsidian to default theme
   - Close unrelated apps and windows
   - Prepare sample content matching the feature you're documenting
   - Set window to appropriate size (1200-1400px width recommended)

3. **Capture Screenshot**
   - Use native tool (`Cmd+Shift+4` on macOS, `Win+Shift+S` on Windows)
   - Or use professional tool (CleanShot X, ShareX, Flameshot)
   - Save as high-quality PNG with temporary name

4. **Edit and Annotate**
   - Open in annotation tool (Skitch, Monosnap, Figma, etc.)
   - Add annotations following color palette and typography guidelines
   - Crop to appropriate size with 20-40px padding
   - Blur any sensitive information

5. **Optimize**
   - Run through image optimizer (ImageOptim, pngquant, Squoosh)
   - Verify file size meets targets
   - Check quality at 100% and 50% zoom
   - Confirm text readability

6. **Save and Organize**
   - Rename following naming convention above
   - Move to appropriate subdirectory (`01-getting-started/`, etc.)
   - Update documentation to reference new image path
   - Commit with descriptive message

### Screenshot Categories

Refer to [`SCREENSHOT_GUIDE.md`](../SCREENSHOT_GUIDE.md) for detailed guidance on:

1. **Interface Screenshots** - Clean UI overviews
2. **Feature Demonstrations** - Annotated functionality highlights
3. **Before/After Comparisons** - Visual change demonstrations
4. **Step-by-Step Sequences** - Multi-step workflow guides
5. **Settings/Configuration** - Configuration documentation

---

## Annotation Standards

### Color Palette

Use consistent colors for annotations (see full guide for hex codes):

| Purpose | Light Theme | Dark Theme |
|---------|-------------|------------|
| Primary Highlight | Red | Light Red |
| Secondary Highlight | Blue | Light Blue |
| Success/Positive | Green | Light Green |
| Warning/Caution | Orange | Light Orange |
| Information | Purple | Light Purple |
| Step Numbers | White on Dark Blue | White on Medium Blue |

### Annotation Elements

- **Highlight Boxes:** 3-4px solid border, 8px corner radius, 20% fill opacity
- **Arrows:** 3-4px line width, triangular or rounded heads
- **Step Indicators:** 32-40px circular badges with white text
- **Text Labels:** 14-16px, semi-bold (600 weight), high contrast

Full details in [`SCREENSHOT_GUIDE.md`](../SCREENSHOT_GUIDE.md#annotation-standards).

---

## Accessibility

All screenshots must meet accessibility standards:

- **Color Contrast:** WCAG AA compliance (4.5:1 for text, 3:1 for UI elements)
- **Alternative Text:** Descriptive alt text in documentation
- **Text Supplement:** Screenshots should enhance, not replace, written instructions
- **Colorblind-Friendly:** Test annotations in grayscale and with colorblind simulators

---

## Maintenance

### When to Update Screenshots

- Plugin UI changes (layout, styling, components)
- New features added or modified
- Terminology changes in UI or docs
- Obsidian core UI updates affecting context
- Existing screenshots become unclear or outdated

### Update Checklist

- [ ] Identify all affected screenshots (check related workflows)
- [ ] Follow same naming convention and style guide
- [ ] Update all related screenshots together (maintain consistency)
- [ ] Verify documentation references correct new paths
- [ ] Test documentation flow after updates
- [ ] Archive old screenshots with version tag (if needed for reference)

---

## Tools and Resources

### Screenshot Capture
- **macOS:** CleanShot X, Xnapper, native `Cmd+Shift+4`
- **Windows:** ShareX, Greenshot, Snipping Tool
- **Linux:** Flameshot, Ksnip, GNOME Screenshot

### Annotation
- **Cross-platform:** Figma, Excalidraw
- **macOS:** Skitch, Monosnap
- **Windows:** Snagit, PicPick
- **Linux:** Flameshot (built-in), Ksnip

### Optimization
- **Cross-platform:** Squoosh (web), ImageMagick
- **macOS:** ImageOptim
- **Windows/Linux:** pngquant (CLI)

### Batch Processing

**Optimize all PNGs:**
```bash
pngquant --quality=80-95 --ext=.png --force docs/images/**/*.png
```

**Resize to max width 1400px:**
```bash
mogrify -resize 1400x\> -strip -quality 90 docs/images/**/*.png
```

---

## Questions or Issues?

- **Style Guide:** See [`SCREENSHOT_GUIDE.md`](../SCREENSHOT_GUIDE.md) for complete guidelines
- **Documentation:** Refer to main documentation files for context
- **Feedback:** Open an issue on the Find-n-Replace repository

---

**Version:** 1.0 (2025-10-13)
