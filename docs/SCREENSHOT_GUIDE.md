# Screenshot Style Guide

**Purpose:** Ensure consistent, professional, and accessible documentation screenshots across all Find-n-Replace documentation.

---

## Table of Contents

1. [Technical Specifications](#technical-specifications)
2. [Annotation Standards](#annotation-standards)
3. [Screenshot Categories](#screenshot-categories)
4. [Naming Conventions](#naming-conventions)
5. [Best Practices](#best-practices)
6. [Tools and Workflow](#tools-and-workflow)
7. [Accessibility Guidelines](#accessibility-guidelines)
8. [Quality Checklist](#quality-checklist)

---

## Technical Specifications

### Resolution and Display

**Minimum Requirements:**
- **Standard Displays:** 1920x1080 pixels minimum
- **Retina/HiDPI Displays:** 2560x1440 pixels preferred
- **Device Pixel Ratio:** Capture at 2x for retina displays if possible

**Aspect Ratios:**
- **Full Interface:** 16:9 or native window size
- **Focused Features:** Cropped to relevant area with 20-40px padding
- **Side-by-Side Comparisons:** Split 50/50 or maintain natural proportions

### File Format and Compression

**Primary Format:** PNG
- Lossless compression for UI elements
- Supports transparency for overlays
- Maintains text clarity

**Optimization:**
- Use tools like `pngquant` or `ImageOptim` to reduce file size
- Target: 200-500 KB for full screenshots
- Target: 50-150 KB for cropped/focused screenshots
- Never sacrifice text readability for compression

**Alternative Formats:**
- **GIF:** For short animations (< 5 seconds, < 2 MB)
- **WebP:** Optional for modern browsers (provide PNG fallback)

### Theme and Appearance

**Required Variants:**
- **Light Theme:** Default for primary documentation
- **Dark Theme:** Alternative screenshots for user preference
- Name files with `-light` or `-dark` suffix when providing both

**Obsidian Theme:**
- Use **default Obsidian theme** (not custom community themes)
- Ensures consistency and recognizability
- Users should see familiar, standard interface

**Window Chrome:**
- **Hide:** Browser toolbars, bookmarks, OS dock/taskbar
- **Show:** Obsidian ribbon (left sidebar) when relevant to context
- **Minimal:** Focus on plugin content, not surrounding UI

---

## Annotation Standards

### Color Palette

Use consistent colors for different annotation types:

| Purpose | Light Theme | Dark Theme | Hex (Light) | Hex (Dark) |
|---------|-------------|------------|-------------|------------|
| **Primary Highlight** | Red | Light Red | `#E74C3C` | `#FF6B6B` |
| **Secondary Highlight** | Blue | Light Blue | `#3498DB` | `#74B9FF` |
| **Success/Positive** | Green | Light Green | `#27AE60` | `#51CF66` |
| **Warning/Caution** | Orange | Light Orange | `#E67E22` | `#FFA94D` |
| **Information** | Purple | Light Purple | `#9B59B6` | `#B197FC` |
| **Step Numbers** | White on Dark Blue | White on Medium Blue | BG: `#2C3E50` | BG: `#4A5568` |

### Typography for Annotations

**Callout Text:**
- **Font Family:** System UI (SF Pro, Segoe UI, Roboto)
- **Font Size:** 14-16px for labels, 18-22px for titles
- **Font Weight:** 600 (Semi-Bold) for emphasis
- **Color:** Match annotation color or use high contrast

**Step Numbers:**
- **Font Family:** System UI monospace or rounded sans
- **Font Size:** 18-24px
- **Font Weight:** 700 (Bold)
- **Background:** Circular badge with color from palette
- **Text Color:** White for contrast

### Shapes and Indicators

#### Highlight Boxes
```
Style: Solid border, 3-4px width
Corner Radius: 8px
Fill: Semi-transparent (20% opacity)
Border: Solid color from palette
Shadow: Optional subtle drop shadow (2px blur, 10% opacity)
```

#### Arrows
```
Style: Simple, clean arrows
Width: 3-4px line
Head: Triangular or rounded
Color: Solid from palette
Shadow: Optional for visibility against busy backgrounds
```

#### Step Indicators (Numbered Circles)
```
Shape: Perfect circle
Size: 32-40px diameter
Background: Solid color from "Step Numbers" row
Border: Optional 2px white outline for visibility
Text: White, centered, bold
```

#### Blur/Redaction
```
Method: Gaussian blur (20-30px radius) or solid color block
Use: Hide sensitive information (vault names, personal data)
Color: Match background or use neutral gray
```

### Annotation Placement

**Guidelines:**
1. **Non-Intrusive:** Place annotations outside the UI when possible
2. **Clear Association:** Use arrows/lines to connect labels to elements
3. **Reading Order:** Arrange annotations left-to-right, top-to-bottom
4. **Spacing:** Maintain 10-15px minimum spacing between annotations
5. **Alignment:** Align multiple annotations for visual consistency

---

## Screenshot Categories

### 1. Interface Screenshots

**Purpose:** Show clean, uncluttered plugin UI for overview and navigation

**Characteristics:**
- No annotations or minimal labels
- Full plugin view or major panel sections
- Default state (not mid-operation)
- Representative sample data (3-5 search results)

**Examples:**
- Full plugin sidebar view
- Settings panel overview
- Empty state (no search performed)
- Help modal display

**Guidelines:**
- Use realistic but non-distracting sample content
- Show typical result counts (not 0 or 1000+)
- Ensure all text is readable at documentation size

### 2. Feature Demonstrations

**Purpose:** Highlight specific functionality with annotations

**Characteristics:**
- Focused crop on relevant UI section
- 2-5 annotations explaining elements
- Shows feature in active/engaged state
- Clear before/after context when applicable

**Examples:**
- Filter panel with "files to include" pattern highlighted
- Regex toggle button with explanation callout
- Multi-selection with visual selection indicators
- Replace preview with capture group expansion

**Guidelines:**
- Crop tightly to feature (with padding)
- Use numbered steps if sequence matters
- Highlight interactive elements (buttons, inputs)
- Show expected results/feedback

### 3. Before/After Comparisons

**Purpose:** Demonstrate changes and replacement results

**Characteristics:**
- Side-by-side or sequential layout
- Clear "Before" and "After" labels
- Identical framing and zoom level
- Highlight what changed

**Examples:**
- File content before/after replacement
- Search results count before/after filter adjustment
- Settings panel before/after configuration change

**Guidelines:**
- Use consistent dimensions for both images
- Place "Before" on left or top
- Draw attention to changes with highlights/arrows
- Include context showing operation performed

### 4. Step-by-Step Sequences

**Purpose:** Guide users through multi-step workflows

**Characteristics:**
- 3-6 sequential screenshots
- Numbered step indicators (prominent)
- Progressive state changes visible
- Consistent framing across steps

**Examples:**
- Complete search and replace workflow
- Configuring advanced filters
- Using search history navigation
- Setting up keyboard shortcuts

**Guidelines:**
- Number every step clearly (1, 2, 3...)
- Show cursor/focus state when relevant
- Maintain same zoom/crop across sequence
- Include brief caption per step

### 5. Settings/Configuration

**Purpose:** Document configuration options and their effects

**Characteristics:**
- Full settings panel or focused section
- Highlight modified settings
- Show default vs. customized states
- Explain impact of each setting

**Examples:**
- Plugin settings tab overview
- File filter configuration section
- Search history settings
- Logger level selection

**Guidelines:**
- Use default settings as baseline
- Annotate non-obvious options
- Show validation feedback (if applicable)
- Link settings to resulting behavior

---

## Naming Conventions

### File Naming Structure

```
{section}-{feature}-{variant}.png
```

**Components:**

1. **Section** (2 digits): Document section number
   - `01` = Getting Started
   - `02` = Basic Features
   - `03` = Advanced Features
   - `04` = Settings
   - `05` = Workflows
   - `06` = Tips & Tricks

2. **Feature** (descriptive-kebab-case): Specific feature shown
   - Use 2-4 words
   - Be specific and searchable
   - Avoid abbreviations

3. **Variant** (optional suffixes):
   - `-light` or `-dark` = Theme variant
   - `-before` or `-after` = Comparison state
   - `-step1`, `-step2`, etc. = Sequence number
   - `-annotated` = Annotated version of clean screenshot

### Examples

```
01-getting-started-first-search.png
01-getting-started-first-search-dark.png
02-basic-file-filtering-panel-expanded.png
02-basic-replace-operations-step1.png
02-basic-replace-operations-step2.png
03-advanced-regex-preview-before.png
03-advanced-regex-preview-after.png
04-settings-search-history-config.png
05-workflow-refactoring-links-step1-annotated.png
06-tips-keyboard-shortcuts-reference.png
```

### Directory Organization

```
docs/images/
├── 01-getting-started/
│   ├── first-search.png
│   ├── understanding-results.png
│   └── first-replacement.png
├── 02-basic-features/
│   ├── file-filtering-panel.png
│   ├── search-options.png
│   └── ...
├── 03-advanced-features/
│   └── ...
├── 04-settings/
│   └── ...
├── 05-workflows/
│   └── ...
└── 06-tips-tricks/
    └── ...
```

**Benefits:**
- Organized by documentation section
- Easy to locate and update
- Supports batch operations
- Maintains relationship to docs

---

## Best Practices

### Content Guidelines

**DO:**
- ✅ Use realistic, representative data
- ✅ Show successful operations and expected states
- ✅ Include subtle UI feedback (hover, focus, selection)
- ✅ Demonstrate with commonly used file types (.md, .txt)
- ✅ Show typical vault structures (3-10 folders, 10-100 files)
- ✅ Use clear, readable fonts at 100% zoom
- ✅ Capture complete UI elements (no cut-off buttons)

**DON'T:**
- ❌ Include personal/sensitive information
- ❌ Show error states without context/explanation
- ❌ Use custom themes or excessive customization
- ❌ Capture during animations/transitions
- ❌ Include unrelated Obsidian UI (other plugins)
- ❌ Show extreme edge cases (0 results, 10,000 results)
- ❌ Use Lorem Ipsum or meaningless placeholder text

### Consistency Checklist

For each screenshot, verify:

- [ ] **Resolution:** Meets minimum requirements
- [ ] **Theme:** Default Obsidian theme used
- [ ] **Annotations:** Match color palette and style guide
- [ ] **Cropping:** Appropriate padding around focus area
- [ ] **Text Readability:** All text legible at 100% documentation size
- [ ] **File Name:** Follows naming convention
- [ ] **File Size:** Optimized without quality loss
- [ ] **Accessibility:** Sufficient contrast for annotations

### Update and Maintenance

**When to Update Screenshots:**
- Plugin UI changes (layout, colors, components)
- New features added
- Terminology changes
- Obsidian core UI updates affecting context
- Annotations become unclear or outdated

**Version Tracking:**
- Note plugin version in screenshot metadata (if possible)
- Keep archive of old screenshots for reference
- Update related screenshots together (workflows)
- Test documentation flow after screenshot updates

---

## Tools and Workflow

### Recommended Screenshot Tools

**macOS:**
- **Default:** `Cmd+Shift+4` (region capture)
- **Professional:** CleanShot X, Xnapper
- **Annotation:** Skitch, Monosnap

**Windows:**
- **Default:** `Win+Shift+S` (Snipping Tool)
- **Professional:** ShareX, Greenshot
- **Annotation:** Snagit, PicPick

**Linux:**
- **Default:** GNOME Screenshot, Spectacle
- **Professional:** Flameshot, Shutter
- **Annotation:** Ksnip, Flameshot (built-in)

**Cross-Platform:**
- **Annotation:** Figma, Excalidraw
- **Optimization:** ImageOptim, Squoosh
- **Batch Processing:** ImageMagick scripts

### Capture Workflow

1. **Prepare Environment:**
   - Close unrelated apps and windows
   - Set Obsidian to default theme
   - Prepare sample content/vault state
   - Set window size (1200-1400px width recommended)

2. **Capture Screenshot:**
   - Use native screenshot tool or professional app
   - Capture full window or focused region
   - Save as high-quality PNG
   - Name with temporary descriptive name

3. **Edit and Annotate:**
   - Open in annotation tool
   - Add annotations following style guide
   - Crop to appropriate size with padding
   - Blur any sensitive information

4. **Optimize:**
   - Run through image optimization tool
   - Verify file size (target ranges)
   - Check quality at 100% and 50% zoom
   - Confirm text readability

5. **Save and Organize:**
   - Rename following naming convention
   - Move to appropriate docs/images/ subdirectory
   - Update documentation with correct path
   - Commit with descriptive message

### Batch Processing Scripts

**ImageMagick - Resize and Optimize:**
```bash
# Resize to max width 1400px (maintain aspect ratio)
mogrify -resize 1400x\> -strip -quality 90 docs/images/**/*.png

# Add consistent drop shadow to all screenshots
mogrify -bordercolor white -border 1x1 \
  -background black -gravity center \
  -shadow 80x3+0+0 docs/images/**/*.png
```

**pngquant - Compress:**
```bash
# Compress all PNGs with quality 80-95
pngquant --quality=80-95 --ext=.png --force docs/images/**/*.png
```

---

## Accessibility Guidelines

### Color Contrast

**Annotations Must Meet WCAG AA:**
- **Normal Text:** 4.5:1 contrast ratio minimum
- **Large Text (18px+):** 3:1 contrast ratio minimum
- **UI Elements:** 3:1 contrast ratio for borders/shapes

**Testing Tools:**
- WebAIM Contrast Checker
- Colorblind Vision Simulator
- Ensure annotations visible in grayscale

### Alternative Text

**When Using Screenshots in Documentation:**
- Provide descriptive alt text for all images
- Include key information visible in screenshot
- Don't just say "Screenshot of plugin" - be specific
- Example: `"Find-n-Replace plugin showing regex search with three matches across two files, with the replace preview displayed"`

### Screen Reader Considerations

**Supplement Screenshots With:**
- Text descriptions of visual elements
- Step-by-step text instructions
- Keyboard shortcut alternatives
- Linked references to specific UI elements

---

## Quality Checklist

Before finalizing any screenshot, verify all items:

### Technical Quality
- [ ] Resolution meets minimum requirements (1920x1080+)
- [ ] File format is PNG (or GIF for animations)
- [ ] File size is optimized (< 500 KB for full, < 150 KB for cropped)
- [ ] Image is crisp and sharp (no blur or artifacts)
- [ ] Colors are accurate (not washed out or oversaturated)

### Content Quality
- [ ] Shows relevant feature/functionality clearly
- [ ] Uses default Obsidian theme
- [ ] Contains realistic, representative data
- [ ] No personal or sensitive information visible
- [ ] All text is readable at intended display size
- [ ] UI elements are complete (no cut-off sections)

### Annotation Quality
- [ ] Annotations use color palette from style guide
- [ ] Text is legible and properly sized
- [ ] Shapes and arrows are clean and professional
- [ ] Annotations don't obscure critical UI elements
- [ ] Numbered steps are sequential and clear
- [ ] Sufficient contrast for accessibility

### Organization Quality
- [ ] File name follows naming convention
- [ ] File is in correct docs/images/ subdirectory
- [ ] Variant suffixes are accurate (-light, -dark, -step1, etc.)
- [ ] Related screenshots are consistent in style
- [ ] Documentation references correct image path

### Documentation Integration
- [ ] Screenshot placeholder in docs is replaced with actual image
- [ ] Image path is correct (relative to document)
- [ ] Alt text is descriptive and helpful
- [ ] Caption/description provides additional context
- [ ] Screenshot fits logically in document flow

---

## Version History

**v1.0** (2025-10-13): Initial screenshot style guide for Find-n-Replace documentation

---

**Questions or Suggestions?**
Open an issue on the Find-n-Replace repository to discuss documentation improvements or style guide updates.
