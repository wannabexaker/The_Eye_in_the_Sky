# Chrome DevTools MCP Server Setup

## Installation Status ✅

The Chrome DevTools MCP server has been configured for this project via VS Code's MCP client integration.

### Configuration Location
- **File**: `.vscode/settings.json`
- **Setting**: `modelContext.mcpServers.chrome-devtools`

### Current Configuration
```json
{
  "modelContext.mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

## System Requirements

✅ **Node.js LTS**: v24.11.1 (installed)
✅ **npm**: 11.6.2 (installed)
⚠️ **Chrome**: Not found in PATH (optional - server can launch or connect to running instance)

## What You Can Do

The Chrome DevTools MCP server gives you access to:

### Browser Automation (10 tools)
- `click`, `drag`, `fill`, `fill_form`, `handle_dialog`, `hover`, `press_key`, `type_text`, `upload_file`, `click_at`

### Navigation (6 tools)
- `close_page`, `list_pages`, `navigate_page`, `new_page`, `select_page`, `wait_for`

### Performance Analysis (3 tools)
- `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`

### Network Debugging (2 tools)
- `list_network_requests`, `get_network_request`

### Screenshots & Inspection (8+ tools)
- `take_screenshot`, `take_snapshot`, `evaluate_script`, `list_console_messages`, `get_console_message`

### Advanced Features
- Lighthouse audits
- Memory/heap snapshots
- Extension management
- Headless & emulation modes

## Usage in VS Code Chat

### Quick Test
Ask the Copilot chat:
```
Check the performance of https://developers.chrome.com
```

The MCP server will automatically:
1. Launch or connect to Chrome
2. Navigate to the URL
3. Record a performance trace
4. Analyze and report insights

### Common Tasks

**Take a screenshot of a webpage:**
```
Take a screenshot of https://example.com
```

**Check for console errors:**
```
Navigate to https://example.com and report any console errors
```

**Analyze network performance:**
```
Load https://example.com and show me the network requests
```

**Emulate mobile device:**
```
Test https://example.com on a mobile viewport (375x667) and take a screenshot
```

## Configuration Options

You can enhance the configuration in `.vscode/settings.json` with these options:

### Headless Mode (No Browser Window)
```json
{
  "args": ["-y", "chrome-devtools-mcp@latest", "--headless"]
}
```

### Slim Mode (Basic Browser Tasks Only)
```json
{
  "args": ["-y", "chrome-devtools-mcp@latest", "--slim", "--headless"]
}
```

### Custom Chrome Path
```json
{
  "args": ["-y", "chrome-devtools-mcp@latest", "--executablePath=/path/to/chrome"]
}
```

### Connect to Running Chrome Instance
1. Start Chrome with remote debugging:
   ```powershell
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug"
   ```

2. Update config:
   ```json
   {
     "args": ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
   }
   ```

### Enable Advanced Features
```json
{
  "args": [
    "-y",
    "chrome-devtools-mcp@latest",
    "--experimentalVision",
    "--experimentalMemory",
    "--experimentalPageIdRouting"
  ]
}
```

## Troubleshooting

### Chrome Not Found
If Chrome isn't in your PATH:
1. **Install Chrome**: Download from https://www.google.com/chrome/
2. **Use custom path**: Add `--executablePath` to config
3. **Connect to running instance**: Use `--browser-url` option

### Enable Logging
```json
{
  "args": ["-y", "chrome-devtools-mcp@latest", "--logFile=/tmp/chrome-devtools.log"],
  "env": {"DEBUG": "*"}
}
```

### Performance Issues
- Use `--slim` mode for basic tasks
- Use `--headless` to reduce resource usage
- Disable unused categories: `--categoryPerformance=false`

## Privacy & Data

- Chrome DevTools MCP sends **usage statistics to Google** by default (opt-out: `--no-usage-statistics`)
- Performance tools may send trace URLs to Google CrUX API (opt-out: `--no-performance-crux`)
- The server has full access to browser content (don't browse sensitive data)

## References

- [Official Repository](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Tool Reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md)
- [Troubleshooting Guide](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/troubleshooting.md)
- [Design Principles](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/design-principles.md)

---

**Last Updated**: June 2, 2026
**Status**: Ready for use in VS Code Chat
