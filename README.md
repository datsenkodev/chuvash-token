# Chuvash Token - Telegram Mini App

A Telegram Mini App built with vanilla JavaScript featuring bottom tab navigation, user profile, and backend integration capabilities.

## Features

- ✅ Bottom tab navigation (Home, Referral, Profile)
- ✅ Header with Telegram username and Withdraw button
- ✅ Two content blocks on home screen
- ✅ Telegram WebApp API integration
- ✅ Backend-ready API service
- ✅ Dark theme UI
- ✅ Responsive design

## Project Structure

```
chuvash-token/
├── public/
│   ├── index.html          # Main HTML file
│   └── manifest.json       # App manifest
├── src/
│   ├── index.js           # App entry point
│   ├── app.js             # App state manager
│   ├── components/        # Reusable components
│   ├── screens/           # Screen components
│   │   ├── HomeScreen.js      # Home with content blocks
│   │   ├── ProfileScreen.js   # User profile
│   │   └── SettingsScreen.js  # Referral screen
│   ├── services/
│   │   ├── api.js         # Backend API integration
│   │   └── telegram.js    # Telegram WebApp API wrapper
│   ├── styles/
│   │   └── main.css       # Global styles
│   └── utils/
│       ├── helpers.js     # Helper functions
│       └── navigation.js  # Navigation logic
└── package.json

```

## Setup & Development

### 1. Local Development

```bash
# Serve the app locally
npm run dev
```

This will start a local server at `http://localhost:8080`

### 2. Testing with Telegram

Since Telegram Mini Apps only work inside Telegram, you need to:

1. **Create a Telegram Bot**
   - Talk to [@BotFather](https://t.me/BotFather)
   - Use `/newbot` command
   - Save your bot token

2. **Set up Mini App**
   - Use `/newapp` command in BotFather
   - Provide app details
   - Upload your app URL (must be HTTPS)

3. **Deploy your app**
   - Use services like:
     - GitHub Pages
     - Netlify
     - Vercel
     - Cloudflare Pages
   
   **Note:** Must use HTTPS!

### 3. Backend Integration

The app includes a ready-to-use API service in `src/services/api.js`:

```javascript
// Update API_BASE_URL in src/services/api.js
const API_BASE_URL = 'https://your-backend-api.com/api';
```

**Backend Requirements:**
- Validate Telegram init data for security
- Example endpoint structure:
  - `GET /api/users/:userId/balance`
  - `POST /api/users/:userId/claim`
  - `GET /api/users/:userId/referrals`

**Security:**
- App sends `X-Telegram-Init-Data` header
- Backend must validate this data using Telegram's crypto
- [Validation Guide](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

## How Navigation Works

The app uses vanilla JavaScript with a simple navigation system:

1. Bottom tabs have `data-tab` attributes
2. Clicking a tab calls `navigateTo(tab)`
3. The appropriate screen render function is called
4. Content is injected into `#mainContent`

## Key Files Explained

### `src/index.js`
App initialization, Telegram WebApp setup, event listeners

### `src/services/telegram.js`
Wrapper for Telegram WebApp API:
- `initTelegramApp()` - Initialize and configure
- `getTelegramUser()` - Get user data
- `showAlert()` - Show alerts
- `hapticFeedback()` - Haptic feedback

### `src/services/api.js`
Backend communication with authentication headers

### `src/utils/navigation.js`
Tab navigation and screen rendering logic

## Common Issues & Solutions

### 1. App doesn't work outside Telegram
**Normal behavior** - Mini Apps only work when opened via Telegram bot

### 2. "Telegram is not defined" error
Make sure `telegram-web-app.js` is loaded:
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

### 3. Styles not loading
Check that CSS path in `index.html` is correct:
```html
<link rel="stylesheet" href="../src/styles/main.css">
```

### 4. HTTPS required
Telegram requires HTTPS for Mini Apps. Use ngrok for local testing:
```bash
npx ngrok http 8080
```

## Deployment

### GitHub Pages
```bash
# Build is not needed for vanilla JS
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

Enable GitHub Pages in repository settings → Pages → Source: main branch

### Netlify
1. Drag and drop `public` folder to [Netlify](https://app.netlify.com)
2. Or connect GitHub repo
3. Set publish directory: `public`

## Testing Checklist

- [ ] Test all three tabs (Home, Referral, Profile)
- [ ] Verify username displays correctly
- [ ] Test Withdraw button
- [ ] Test content block buttons
- [ ] Test referral link copy
- [ ] Verify on iOS and Android
- [ ] Test backend API calls
- [ ] Check haptic feedback

## Next Steps

1. Replace placeholder data with real backend calls
2. Add authentication flow
3. Implement actual withdraw functionality
4. Add loading states
5. Add error handling
6. Implement real token balance tracking

## Resources

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Telegram WebApp API](https://core.telegram.org/bots/webapps#initializing-mini-apps)
- [Bot API](https://core.telegram.org/bots/api)

## License

MIT
