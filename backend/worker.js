const CACHE_TTL = 60 * 60 * 24 * 2 // 2日

// URLをそのままキャッシュキーにする。
function getCacheKey(url) {
  return new Request(url.toString(), { method: "GET" })
}
import MarkdownIt from "markdown-it"
import hljs from "highlight.js"

// MarkdownItの設定
const escapeHtml = MarkdownIt().utils.escapeHtml
const md = new MarkdownIt(
  { 
    html: false,
    linkify: true,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try { 
          return <pre class="hljs"><code>${
            hljs.highlight(str, { language: lang }).value 
            }</code></pre> 
          }catch (e) { 
            console.warn("highlight error:", e) 
          } 
        } 

        return <pre class="hljs"><code>${escapeHtml(str)}</code></pre> 
      } 
  })


export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    const parts = url.pathname.split("/")

    // URLの形式が/view/:guildId/:channelId/:messageIdでない場合はエラー
    if (parts.length < 5 || parts[1] !== "view") {
      return new Response("invalid url", { status: 400 })
    }

    const guildId = parts[2]
    const channelId = parts[3]
    const messageId = parts[4]

    if (!guildId || !channelId || !messageId) {
      return new Response("missing params", { status: 400 })
    }

    const cache = caches.default
    const cacheKey = getCacheKey(req.url)

    // ====== キャッシュ確認 ======
    const cached = await cache.match(cacheKey)
    if (cached) {
      const res = new Response(cached.body, cached)

      res.headers.set("Content-Type", "text/html; charset=utf-8")
      res.headers.set("Access-Control-Allow-Origin", "*")
      res.headers.set("x-cache", "HIT")

      return res
    }

    // ====== Discord API ======
    const discordRes = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bot ${env.DISCORD_TOKEN}`
        }
      }
    )

    // Discord APIからのレスポンスが正常でない場合はエラー
    if (!discordRes.ok) {
      console.error("discord api error", {
        status: discordRes.status,
        statusText: discordRes.statusText,
        url: discordRes.url
      })
      return new Response("failed discord fetch", { status: 500 })
    }

    const message = await discordRes.json()

    const attachment = message.attachments?.find(a =>
      a.content_type?.includes("text")  ||
      a.filename?.endsWith(".md")       ||
      a.filename?.endsWith(".markdown") ||
      a.filename?.endsWith(".MD")       ||
      a.filename?.endsWith(".MARKDOWN") ||
      a.filename?.endsWith(".Md")       
    )

    if (!attachment) {
      console.log("no markdown attachment found in message", { messageId, attachments: message.attachments })
      return new Response("no markdown attachment found", {
        headers: { "Content-Type": "application/json" }
      })
    }

    // ====== Markdownの取得とHTML変換 ======
    const mdText = await fetch(attachment.url).then(r => r.text())
    const html = md.render(mdText)

    // ====== HTMLをレスポンスとして返す ======
    const response = new Response(
      `<!doctype html>
      <html>
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">

      <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.css">

      <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        max-width: 800px;
        margin: 40px auto;
        padding: 0 16px;
        line-height: 1.7;
      }

      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas;
      }

      pre {
        overflow-x: auto;
        border-radius: 6px;
      }

      pre.hljs {
        background: #f6f8fa;
        border: 1px solid #d0d7de;
        padding: 12px;
      }

      h1,h2,h3 {
        border-bottom: 1px solid #ddd;
      }
      </style>
      </head>

      <body>
      ${html}
      </body>
      </html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
          "Access-Control-Allow-Origin": "*",
          "x-cache": "MISS"
        }
      }
    )

    // ====== エッジキャッシュ保存 ======
    ctx.waitUntil(cache.put(cacheKey, response.clone()))

    return response
  }
}