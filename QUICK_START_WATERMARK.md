# Quick Start Guide - Watermark Removal

## Step 1: Get API Key (5 minutes)

1. Go to https://platform.dewatermark.ai
2. Sign up for an account
3. Purchase credits: **$7 for 100 credits** (recommended for testing)
4. Copy your API key from the dashboard

## Step 2: Configure Environment (1 minute)

```bash
cd web

# Create .env.local file
cp .env.example .env.local

# Edit .env.local and paste your API key
nano .env.local  # or use your favorite editor
```

Your `.env.local` should look like:
```bash
NEXT_PUBLIC_APP_URL=https://fotoyu.example.com

# Add this line with your actual API key:
DEWATERMARK_API_KEY=paste_your_api_key_here
DEWATERMARK_API_URL=https://platform.dewatermark.ai/api/object_removal/v2/erase
```

## Step 3: Start Development Server (1 minute)

```bash
npm install  # if you haven't already
npm run dev
```

Open http://localhost:3000

## Step 4: Test the Feature (2 minutes)

1. **Load some photos** (use any mode: Token, Paste, or Bookmarklet)
2. **Enable watermark removal** - Toggle the switch at the top
3. **Test single photo**:
   - Click the dropdown arrow (▼) on any photo card
   - Click "Hapus watermark (AI)"
   - Wait 2-5 seconds
   - Check the downloaded image
4. **Test bulk removal**:
   - Select multiple photos with checkboxes
   - Click "Download X terpilih"
   - Watch the progress
   - Verify all photos are processed

## Step 5: Monitor Usage

- Check cost estimates in the settings panel before downloading
- Monitor API usage at https://platform.dewatermark.ai/dashboard
- Each photo uses ~1 credit ($0.07 for entry tier, cheaper at volume)

## Troubleshooting

### "DEWATERMARK_API_KEY not configured" error
- Make sure `.env.local` exists in the `web/` folder
- Check that your API key is correct (no extra spaces)
- Restart the dev server after changing .env.local

### Watermark removal fails
- Verify API key is valid at https://platform.dewatermark.ai/dashboard
- Check you have remaining credits
- Look at browser console (F12) for error messages

### Processing is slow (>10s)
- Normal: 2-5 seconds per image
- Check your internet connection
- Verify Dewatermark.ai service status

## Production Deployment

### Vercel
```bash
# In Vercel dashboard, add environment variable:
DEWATERMARK_API_KEY = your_api_key_here
```

### Docker/VPS
```bash
# Edit .env file
nano .env

# Add:
DEWATERMARK_API_KEY=your_api_key_here

# Rebuild
docker compose up -d --build
```

## Cost Reference

| Photos | Cost | Per Photo | Best For |
|--------|------|-----------|----------|
| 100 | $7 | $0.07 | Testing |
| 1,000 | $25 | $0.025 | Medium use |
| 10,000 | $100 | $0.01 | High volume |

Credits never expire - pay once, use anytime.

---

**That's it!** You now have AI-powered watermark removal integrated into Fotoyu Downloader. 🎉
