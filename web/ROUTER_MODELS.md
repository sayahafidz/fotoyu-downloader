# Router model configuration

Scanned `https://9router.sayahafidz.my.id/v1/models` on 2026-10-06 using the configured server credential. The endpoint returned 96 model entries. This verifies advertised availability, not successful image editing.

## Image-output models advertised by this router

| Model ID | Image input | Image output |
| --- | --- | --- |
| `hfz/gemini-3-pro-image` | Yes | Yes |
| `hfz/gemini-3.1-flash-image` | Yes | Yes |
| `rjk/gemini-3.1-flash-image` | Yes | Yes |

The current Gemini model is already `hfz/gemini-3.1-flash-image`.

```dotenv
GEMINI_BASE_URL=https://9router.sayahafidz.my.id/v1
GEMINI_MODEL=hfz/gemini-3.1-flash-image
GEMINI_API_KEY=your-router-key
```

Keep the real key only in the server's environment file.

## GPT / ChatGPT

The router advertises GPT models including `cx/gpt-6.1-sol`, `cx/gpt-6-astra`, `cx/gpt-6-sol`, `cx/gpt-6-luna`, `cx/gpt-5.6-sol`, and `cx/gpt-5.5`. All GPT entries in the scanned catalogue advertise `imageOutput: false`. Many advertise `vision: true`, which means image input, not edited-image output.

No GPT image-output model is currently advertised, so these models are unsuitable for this app's watermark image pipeline. Do not configure a text-only GPT model as a working watermark editor.

When an image-output GPT model becomes available on the router, configure its exact ID:

```dotenv
OPENAI_BASE_URL=https://9router.sayahafidz.my.id/v1
OPENAI_API_MODE=chat
OPENAI_MODEL=replace-with-advertised-image-output-model-id
OPENAI_API_KEY=your-router-key
```

This block is a configuration template, not a currently working model selection. If the router instead supports OpenAI's image-edit endpoint, set `OPENAI_API_MODE=edits` and use an image-edit model offered by that endpoint. `/models` does not demonstrate that `/images/edits` is supported.

Apply environment changes:

```sh
docker compose up -d --force-recreate web
```

Gemini remains the application's default provider. The missing GPT image-output capability requires router/provider support, not a different prompt.
