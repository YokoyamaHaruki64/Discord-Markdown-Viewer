import MarkdownIt from "markdown-it"

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
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
      return new Response("no markdown attachment", { status: 404 })
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
  <title>Discord Markdown Viewer</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 16px;
      line-height: 1.6;
      background: #0f0f0f;
      color: #e5e5e5;
    }
    a { color: #6ea8fe; }
    code {
      background: #1e1e1e;
      padding: 2px 4px;
      border-radius: 4px;
    }
    pre {
      background: #1e1e1e;
      padding: 12px;
      overflow-x: auto;
      border-radius: 6px;
    }
    h1,h2,h3 { border-bottom: 1px solid #333; padding-bottom: 4px; }
  </style>
</head>
<body>
${html}
</body>
</html>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        }
      }
    )
  }
}