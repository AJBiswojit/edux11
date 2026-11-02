# Question figure crops from the PDF-extraction pipeline.
#
# ## Path mapping (DB → disk → browser)
#
# | Layer | Example |
# |-------|---------|
# | DB `stem_image_url` / `options[].image_url` | `media/pdf_extract/jee-mathematics/crops/p0001_qQ2_option_1.png` |
# | File on disk (this folder) | `backend/media/pdf_extract/jee-mathematics/crops/p0001_qQ2_option_1.png` |
# | Container path | `/app/media/pdf_extract/...` (Docker `COPY media ./media`) |
# | HTTP (local API) | `http://localhost:8000/media/pdf_extract/...` |
# | HTTP (Docker + nginx) | `https://your-host/media/pdf_extract/...` (nginx proxies `/media` → api) |
#
# Drop the leading `media/` from the DB path when placing files here.
# Keep this folder in git. Set `PUBLIC_ORIGIN` empty behind nginx, or to the
# public API origin for direct :8000 access.
