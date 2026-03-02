# kevinbot-mcp

MCP server for the KevinBot x402 API. Gives Claude Code, Claude Desktop, and any MCP-compatible client access to **20 paid tools** via automatic USDC micropayments on Base.

**12 web/AI utility tools** + **8 live crypto trading signal tools** from a NostalgiaForInfinityX7 bot with 77% win rate.

## Tools

### Web & AI Utilities

| Tool | Price | Description |
|------|-------|-------------|
| `search` | $0.002 | Web search via DuckDuckGo |
| `crawl` | $0.005 | Crawl URL, extract content + links |
| `monitor` | $0.003 | URL change detection |
| `extract_url` | $0.002 | Fetch URL, return markdown + metadata |
| `email_validate` | $0.001 | Email syntax + MX + disposable check |
| `dns_lookup` | $0.001 | DNS record lookup |
| `qr_generate` | $0.001 | Generate QR code |
| `html_to_markdown` | $0.001 | Convert HTML to markdown |
| `summarize` | $0.005 | AI-powered summarization |
| `seo_analyze` | $0.01 | SEO score + issues |
| `code_review` | $0.005 | AI code review |
| `extract_data` | $0.01 | Structured data extraction |

### NFI Trading Signals (Live Bot)

| Tool | Price | Description |
|------|-------|-------------|
| `nfi_status` | $0.005 | Open positions with real-time P&L |
| `nfi_profit` | $0.003 | Win rate, drawdown, daily P&L |
| `nfi_performance` | $0.003 | Per-pair profitability ranking |
| `nfi_signals` | $0.01 | Active entry/exit signals |
| `nfi_pair_rank` | $0.01 | Best/worst performing pairs |
| `nfi_market_regime` | $0.02 | Bullish/bearish/neutral detection |
| `nfi_trade_history` | $0.01 | Recent closed trades with details |
| `nfi_strategy_stats` | $0.02 | Signal modes, exit reasons, risk metrics |

## Setup

You need a Base mainnet wallet with USDC. Export the private key.

### Claude Desktop / Claude Code

Add to your MCP config (`claude_desktop_config.json` or `.claude.json`):

```json
{
  "mcpServers": {
    "kevinbot": {
      "command": "npx",
      "args": ["@baitoxkevin/kevinbot-mcp"],
      "env": {
        "KEVINBOT_PRIVATE_KEY": "0xYOUR_PRIVATE_KEY"
      }
    }
  }
}
```

### Payment

All tools use the [x402 protocol](https://x402.org). When you invoke a tool, the MCP server automatically signs a USDC micropayment on Base mainnet and includes it with the request. Payments are settled via the [PayAI facilitator](https://facilitator.payai.network).

**Price range:** $0.001 - $0.02 per call

## How It Works

1. You call a tool (e.g., `search`)
2. The MCP server sends a request to the KevinBot API
3. API returns `402 Payment Required` with price
4. MCP server signs a gasless USDC transfer authorization (EIP-3009)
5. Retries with signed payment in the header
6. API verifies payment via facilitator and returns results
7. Total latency: ~400ms including payment settlement

## API

Powered by: `https://3000-4cc0720d75b8344a09384cd6f9240c66.life.conway.tech`

Free endpoints (no payment needed):
- `GET /health` - API status
- `GET /.well-known/agent-card.json` - Service discovery
- `GET /.well-known/x402` - x402 payment info

## License

MIT
