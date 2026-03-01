#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { x402Fetch } from "./lib/x402-client.js"

const BASE_URL = process.env.KEVINBOT_BASE_URL || "https://3000-4cc0720d75b8344a09384cd6f9240c66.life.conway.tech"
const PRIVATE_KEY = process.env.KEVINBOT_PRIVATE_KEY

if (!PRIVATE_KEY) {
  console.error("KEVINBOT_PRIVATE_KEY environment variable is required")
  process.exit(1)
}

const TOOLS = [
  {
    name: "search",
    description: "Search the web via DuckDuckGo. Returns titles, URLs, and descriptions. Useful for finding current information, documentation, or any web content.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (max 500 chars)" },
        limit: { type: "number", description: "Max results (1-50, default 10)" },
        region: { type: "string", description: "Region code (default: wt-wt for worldwide)" },
      },
      required: ["query"],
    },
    endpoint: "/api/search",
  },
  {
    name: "crawl",
    description: "Crawl a URL to extract clean markdown content and discover links. Optionally follow same-domain links for multi-page extraction.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to crawl" },
        depth: { type: "number", description: "Link follow depth (0-1, default 0)" },
        maxPages: { type: "number", description: "Max pages to fetch (1-5, default 1)" },
      },
      required: ["url"],
    },
    endpoint: "/api/crawl",
  },
  {
    name: "monitor",
    description: "Check if a URL's content has changed since last check. Uses SHA-256 hash comparison with server-side state.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to monitor for changes" },
      },
      required: ["url"],
    },
    endpoint: "/api/monitor",
  },
  {
    name: "extract_url",
    description: "Fetch a URL and extract clean markdown content with metadata (title, description, word count).",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract content from" },
      },
      required: ["url"],
    },
    endpoint: "/api/extract-url",
  },
  {
    name: "email_validate",
    description: "Validate an email address: syntax check, MX record verification, and disposable domain detection.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to validate" },
      },
      required: ["email"],
    },
    endpoint: "/api/email-validate",
  },
  {
    name: "dns_lookup",
    description: "Look up DNS records (A, MX, CNAME, TXT, AAAA, NS) for a domain.",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domain to look up" },
        types: { type: "array", items: { type: "string" }, description: "Record types (default: A, MX, CNAME, TXT)" },
      },
      required: ["domain"],
    },
    endpoint: "/api/dns-lookup",
  },
  {
    name: "qr_generate",
    description: "Generate a QR code from text. Returns base64-encoded PNG.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text or URL to encode" },
        format: { type: "string", enum: ["base64", "svg"], description: "Output format (default: base64)" },
      },
      required: ["text"],
    },
    endpoint: "/api/qr-generate",
  },
  {
    name: "html_to_markdown",
    description: "Convert raw HTML to clean markdown.",
    inputSchema: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML content to convert" },
      },
      required: ["html"],
    },
    endpoint: "/api/html-to-markdown",
  },
  {
    name: "summarize",
    description: "AI-powered summarization of text or URL content. Returns structured summary with key points.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to summarize (provide url OR text)" },
        text: { type: "string", description: "Text to summarize (provide url OR text)" },
        format: { type: "string", enum: ["paragraph", "bullets"], description: "Output format (default: paragraph)" },
      },
    },
    endpoint: "/api/summarize",
  },
  {
    name: "seo_analyze",
    description: "Analyze a URL for SEO issues. Returns score, issues with severity, and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to analyze" },
      },
      required: ["url"],
    },
    endpoint: "/api/seo-analyze",
  },
  {
    name: "code_review",
    description: "AI-powered code review. Returns quality score, issues by severity, and improvement suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code to review" },
        language: { type: "string", description: "Programming language (auto-detected if omitted)" },
      },
      required: ["code"],
    },
    endpoint: "/api/code-review",
  },
  {
    name: "extract_data",
    description: "Extract structured JSON data from a URL. Optionally provide a schema to guide extraction.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract data from" },
        schema: { type: "object", description: "Optional JSON schema to guide extraction" },
      },
      required: ["url"],
    },
    endpoint: "/api/extract-data",
  },
]

const server = new Server(
  { name: "kevinbot-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const tool = TOOLS.find(t => t.name === name)

  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    }
  }

  try {
    const url = `${BASE_URL}${tool.endpoint}`
    const result = await x402Fetch(url, args || {}, PRIVATE_KEY)

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
