# Premier Cleaners Asset Manifest

Status: implementation manifest for the current static site. `BUSINESS.md` and original files in `assets/photos/` remain the source of truth. Originals are preserved outside `public/`.

## Image Pipeline

Command:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-assets.ps1
```

The script uses Windows/.NET `System.Drawing` already available in the workspace environment. It normalizes EXIF orientation before resizing/cropping, writes new JPEG bitmaps to `public/assets/images/`, and emits `docs/asset-manifest.generated.json`.

Each generated JPEG inspected in this pass reports only property IDs `20625,20624` through `System.Drawing`; no EXIF orientation, GPS, IPTC, XMP, camera make/model, timestamp, or thumbnail properties remain. The original large JPEGs remain untouched and are not referenced from `public/`.

## Published Derivatives

| Public file | Source original | Use | Dimensions | Bytes | Visual review |
| --- | --- | --- | ---: | ---: | --- |
| `assets/images/hallway-portrait-720.jpg` | `assets/photos/CleanedHallway.jpg` | Mobile/tablet Home and Services hallway image | 720x900 | 57,932 | Upright hallway crop with light walls, glass doors, and wood-look flooring; no readable client identity. |
| `assets/images/hallway-portrait-1200.jpg` | `assets/photos/CleanedHallway.jpg` | Desktop Home hero and responsive larger hallway source | 1200x1500 | 131,722 | Upright hallway crop with light walls, glass doors, and wood-look flooring; no readable client identity. |
| `assets/images/elevator-detail-540.jpg` | `assets/photos/Cleaningelevatorhandles.jpg` | Work-detail mosaic | 540x720 | 52,188 | Elevator handrail cleaning with Premier shirt; worker not identified as Donald. |
| `assets/images/elevator-detail-900.jpg` | `assets/photos/Cleaningelevatorhandles.jpg` | Responsive larger work detail | 900x1200 | 112,822 | Same safe crop; no third-party signage visible. |
| `assets/images/clinical-room-640.jpg` | `assets/photos/CleanedDentistArea.jpg` | Clinical/professional context | 640x800 | 65,636 | Dental-style room only; no client name, patient, compliance, or endorsement claim. |
| `assets/images/clinical-room-960.jpg` | `assets/photos/CleanedDentistArea.jpg` | Responsive larger clinical context | 960x1200 | 122,244 | Same safe crop. |
| `assets/images/floor-care-640.jpg` | `assets/photos/Floorpolishing.jpg` | Floor-care context | 640x800 | 58,051 | Floor-care work with Premier shirt; no identity claim. |
| `assets/images/floor-care-960.jpg` | `assets/photos/Floorpolishing.jpg` | Responsive larger floor-care context | 960x1200 | 109,770 | Same safe crop; no readable client identity. |

All photo derivatives are under 400 KB.

## Font Assets

No local webfont files are shipped in this foundation pass. The site uses a system stack in CSS:

```css
"Segoe UI", Arial, sans-serif
```

This avoids external font requests, license redistribution risk, and font transfer weight. If a later worker adds local open-license fonts, add the font files under `public/assets/fonts/`, include the license file, and update this manifest with file sizes and license source.
