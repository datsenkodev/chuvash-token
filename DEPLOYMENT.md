# Deployment Guide for Telegram Mini App

## Prerequisites
- A Telegram bot (create with @BotFather)
- An HTTPS URL for your app

## Quick Deploy Options

### Option 1: GitHub Pages (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Enable GitHub Pages**
- Go to repository Settings → Pages
- Source: `main` branch
- Folder: `/public` (or root if you copy files there)
- Save

3. **Your app URL will be:**
```
https://[username].github.io/[repository-name]/
```

### Option 2: Netlify

1. **Drag & Drop**
- Go to [Netlify](https://app.netlify.com)
- Drag the `public` folder
- Done!

2. **Or via Git**
- Connect your GitHub repo
- Build command: Leave empty
- Publish directory: `public`

### Option 3: Vercel

```bash
npm install -g vercel
cd public
vercel
```

Follow the prompts and your app will be deployed!

## Setting up the Telegram Bot

### 1. Create Bot with BotFather

Open Telegram and message [@BotFather](https://t.me/BotFather):

```
/newbot
```

Follow the instructions and save your bot token.

### 2. Create Mini App

Message BotFather again:

```
/newapp
```

- Select your bot
- Title: "Chuvash Token"
- Description: "Token management app"
- Photo: Upload a square image (640x640)
- Demo GIF: Optional
- Web App URL: Your deployed HTTPS URL
- Short name: chuvash_token (must be unique)

### 3. Test Your App

Send a message to your bot or add a button in bot menu:

```
/mybots
→ Select your bot
→ Bot Settings
→ Menu Button
→ Configure Menu Button
```

URL: Your web app URL

## Environment-Specific Settings

### For Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, create tunnel
ngrok http 8080
```

Use the HTTPS URL from ngrok in BotFather.

**Note:** Free ngrok URLs change each time. You'll need to update BotFather each time.

## Backend Integration

Once deployed, update your backend API:

1. In `src/services/api.js`, change:
```javascript
const API_BASE_URL = 'https://your-backend-api.com/api';
```

2. Your backend should:
   - Accept requests from your Telegram Mini App domain
   - Validate Telegram `initData` 
   - Return JSON responses

### Backend Validation Example (Node.js)

```javascript
const crypto = require('crypto');

function validateTelegramWebAppData(initData, botToken) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
    
    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    
    return calculatedHash === hash;
}
```

## Testing Checklist

Before deploying to production:

- [ ] Test all navigation tabs
- [ ] Verify Telegram user data displays
- [ ] Test on iOS Telegram
- [ ] Test on Android Telegram  
- [ ] Verify HTTPS is working
- [ ] Test backend API calls
- [ ] Check mobile responsiveness
- [ ] Test withdraw button functionality

## Troubleshooting

### "This app can't be opened"
- Ensure your URL is HTTPS
- Check URL is correct in BotFather
- Try clearing Telegram cache

### Styles not loading
- Check browser console for errors
- Verify CSS path in index.html
- Check CORS settings

### User data is null
- App must be opened through Telegram
- Check Telegram script is loaded
- Verify initData is being sent

## Production Tips

1. **Minify your JavaScript and CSS** for faster loading
2. **Add error tracking** (Sentry, LogRocket)
3. **Enable caching** for static assets
4. **Monitor API usage** to prevent abuse
5. **Add loading states** for better UX

## Support

For issues:
- Check [Telegram WebApps Docs](https://core.telegram.org/bots/webapps)
- Review browser console for errors
- Test in Telegram's debug mode
