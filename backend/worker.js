import MarkdownIt from "markdown-it"
import hljs from "highlight.js"

// MarkdownItの設定
const escapeHtml = MarkdownIt().utils.escapeHtml

const md = new MarkdownIt({
  html: false,
  linkify: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang }).value
        }</code></pre>`
      } catch (e) {
        console.warn("highlight error:", e)
      }
    }

    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`
  }
})

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    const parts = url.pathname.split("/")


    // /view/:guild/:channel/:message
    if (parts[1] !== "view") {
      console.log("invalid url by prefix \"view\"", url.pathname)
      return new Response("invalid url by prefix \"view\" ", { status: 400 })
    }

    const guildId = parts[2]
    const channelId = parts[3]
    const messageId = parts[4]

    if (!guildId || !channelId || !messageId) {
      console.log("invalid url by missing parameters", url.pathname)
      return new Response("invalid url by missing parameters", { status: 400 })
    }

    // Discord API取得
    const discordRes = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bot ${env.DISCORD_TOKEN}`
        }
      }
    )

    if (!discordRes.ok) {
      console.log("failed to fetch message", discordRes.status, await discordRes.text())
      return new Response("failed to fetch message", { status: 500 })
    }

    const message = await discordRes.json()

    // 添付ファイル取得（最初の1つ）
    const attachment = message.attachments?.find(a =>
      a.content_type?.includes("text") ||
      a.filename?.endsWith(".md") ||
      a.filename?.endsWith(".markdown") || 
      a.filename?.endsWith(".MD")
    )

    if (!attachment) {
      console.log("no markdown attachment", message.attachments)
       return Response.json(message, {
        headers: {
          headers,
        }
      })
    }

    // md取得
    const mdText = await fetch(attachment.url).then(r => r.text())

    if(!mdText) {
      console.log("failed to fetch markdown content", attachment.url)
      return new Response("failed to fetch markdown content", { status: 500 })
    }

    // markdown → html
    const html = md.render(mdText)

    
    return new Response(
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
      background: #f6f8fa; /* GitHubの薄グレー */
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
          "access-control-allow-origin": "*",
        },
        
      }
    )
  }
}