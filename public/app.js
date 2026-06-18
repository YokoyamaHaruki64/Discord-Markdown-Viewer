// URLからidを取得して、Discord Markdown ViewerのAPIにリクエストを送信し、結果を表示するコード。キャッシュがある場合はそれを使用し、なければAPIから取得。

// URLのパスを分割
const parts = location.pathname.split("/")

// /view/:guild/:channel/:message の形式であることを確認
if (parts.length < 5 || parts[1] !== "view") {
  document.body.innerHTML = "invalid url"
  console.log("invalid url", location.pathname)
  throw new Error("invalid url")
}

// guildId, channelId, messageIdを取得
const guildId = parts[2]
const channelId = parts[3]
const messageId = parts[4]

// キャッシュキーを生成
const cacheKey = `${guildId}:${channelId}:${messageId}`

async function load() {
  // キャッシュがある場合はそれを使用
  const cached = localStorage.getItem(cacheKey)

  if (cached) {
    document.body.innerHTML = cached
    return
  }

  // キャッシュがない場合はAPIから取得
  const res = await fetch(
    `https://discord-markdown-viewer.tartnivo39820.workers.dev/view/${guildId}/${channelId}/${messageId}`
  )

  const html = await res.text()

  document.body.innerHTML = html
  localStorage.setItem(cacheKey, html)
}

load()