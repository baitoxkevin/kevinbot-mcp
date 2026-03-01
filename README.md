# kevinbot-mcp

MCP server for the KevinBot x402 API. Gives Claude Code, Claude Desktop, and any MCP-compatible client access to 12 paid web + AI tools via automatic USDC micropayments on Base.

## Tools

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
| `summarize` | $0.02 | AI-powered summarization |
| `seo_analyze` | $0.03 | SEO score + issues |
| `code_review` | $0.02 | AI code review |
| `extract_data` | $0.03 | Structured data extraction |

## Setup

You need a Base mainnet wallet with USDC. Export the private key.

### Claude Desktop / Claude Code

Add to your MCP config (`claude_desktop_config.json` or `.claude/settings.json`):

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

All tools use the [x402 protocol](https://x402.org). When you invoke a tool, the MCP server automatically signs a USDC micropayment on Base mainnet and includes it with the request. Payments are settled via [PayAI](https://facilitator.payai.network).

## API

Powered by: `https://3000-4cc0720d75b8344a09384cd6f9240c66.life.conway.tech`

## License

MIT
