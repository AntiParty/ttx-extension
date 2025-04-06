# TTX Twitch Extension

![TTX Logo](icons/icon128.png)

A browser extension that displays real-time stock prices and trading alerts for Twitch streamers on the TTX platform.

## Features

- 💰 **Streamer Stock Prices**: See current market value for streamers right on their Twitch channel
- 🔔 **Live Trading Alerts**: Get notifications in chat when viewers buy/sell a streamer's stock
- 🎛️ **Customizable Controls**: Toggle features on/off with the control panel
- ⌨️ **Quick Access**: Open/close with Ctrl+Shift+T keyboard shortcut
- 🖱️ **Draggable UI**: Move the control panel anywhere on screen

## Installation

### Chrome/Edge
1. Download this repository
2. Go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the folder containing this extension

### Firefox
1. Download this repository
2. Go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select any file in the extension folder

## Usage

1. Visit any Twitch streamer's channel (e.g., `twitch.tv/streamername`)
2. The stock price will automatically appear next to the streamer's name
3. Trading alerts will appear in the chat automatically

### Control Panel
- Press **Ctrl+Shift+T** to show/hide the control panel
- Toggle features on/off:
  - **Stock Badge**: Show/hide the price badge
  - **Chat Alerts**: Enable/disable trading notifications
- Click **Refresh Data** to manually update prices

## Configuration

Settings are automatically saved between sessions. To reset:
1. Open Chrome's Developer Tools (F12)
2. Go to Application > Storage > Chrome Storage
3. Delete the TTX entries

## Troubleshooting

**Problem**: Prices/alerts not showing  
✅ Solution: 
- Refresh the Twitch page
- Ensure you're on a streamer's channel page
- Check if the streamer exists on TTX

**Problem**: Control panel won't open  
✅ Solution:
- Make sure you're pressing Ctrl+Shift+T
- Check for conflicts with other extensions
- Reload the extension from `chrome://extensions`

## Development

To modify the extension:

1. Clone this repository
2. Make changes to the files:
   - `content.js` - Main functionality
   - `popup/` - Control panel UI
   - `manifest.json` - Extension configuration

3. Test changes by reloading the extension in `chrome://extensions`

## Support

For issues or feature requests, please [open an issue](https://github.com/your-repo/issues).

## License

MIT License - Free for personal and commercial use

---

**Enjoy trading on TTX!** 🚀