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
       return Response.json(message, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
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
  <title>Discord Markdown Viewer</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 16px;
    line-height: 1.7;
    background: #ffffff;
    color: #24292f;
  }

  a {
    color: #0969da;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  h1 {
    font-size: 2em;
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 0.3em;
  }

  h2 {
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 0.3em;
  }

  h3 {
    margin-top: 24px;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    background: rgba(175, 184, 193, 0.2);
    padding: 0.2em 0.4em;
    border-radius: 6px;
  }

  pre {
    background: #f6f8fa;
    padding: 16px;
    overflow-x: auto;
    border-radius: 6px;
    border: 1px solid #d0d7de;
  }

  pre code {
    background: transparent;
    padding: 0;
  }

  blockquote {
    margin: 0;
    padding-left: 1em;
    color: #57606a;
    border-left: 0.25em solid #d0d7de;
  }

  table {
    border-collapse: collapse;
    width: 100%;
  }

  table th, table td {
    border: 1px solid #d0d7de;
    padding: 6px 13px;
  }

  table th {
    background: #f6f8fa;
  }
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