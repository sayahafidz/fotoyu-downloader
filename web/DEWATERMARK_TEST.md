# Test DeWatermark with Fotoyu

DeWatermark's pricing page advertises 3 free credits/day, but its FAQ says 2/day.
Its API page says keys are available from the account's API management page after
subscribing. Check whether your own free account actually provides an API key.
The integration uses only the published API endpoint, not the web app's private
requests. Upload only photos you own or are authorized to edit.

## Local test

1. Put your official key in `web/.env.local` as `DEWATERMARK_API_KEY=...`.
   Do not paste the key into the browser or commit it. If the file already
   exists, add the setting without overwriting its other values.
2. From `web/`, run `npm run dev` and open `http://localhost:3000`.
3. Load a Fotoyu photo you are authorized to edit, switch on **Hapus Watermark
   Otomatis (AI)**, and choose **Dewatermark.ai**. Try **one** photo first.
4. Compare the saved result against the original. A missing key produces a
   `503` error; insufficient credits produce `402`, and rate limiting produces
   `429`. When processing fails, the downloader saves the original instead.

For Docker, put the key in `web/.env` and run `docker compose up -d --build`
from `web/`. The compose file passes `DEWATERMARK_API_KEY` to the server.

The public example shows `session_id`, `mask_base`, and `mask_brush` in its
multipart request but does not say which fields are mandatory or publish a
complete response schema. The existing integration sends an image with
`remove_text=true` and `predict_mode=3.0`, and expects a JSON response with
`status: "success"` and `edited_image.image` in base64. If the one-photo test
reports an unrecognized response, check the API details attached to your
DeWatermark account before changing the request shape.
