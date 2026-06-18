const CACHE_TTL = 1000 * 60 * 60 * 24 * 2 // 2日

const parts = location.pathname.split("/")

// URLの形式が/view/:guildId/:channelId/:messageIdでない場合はエラー
if (parts.length < 5 || parts[1] !== "view") {
  document.body.innerHTML = "invalid url"
  console.log("invalid url", location.pathname)
  throw new Error("invalid url")
}

const guildId = parts[2]
const channelId = parts[3]
const messageId = parts[4]

const cacheKey = `${guildId}:${channelId}:${messageId}`

async function load() {
  const cachedRaw = localStorage.getItem(cacheKey)

  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw)

      const isValid = Date.now() - cached.timestamp < CACHE_TTL

      // キャッシュが有効ならキャッシュを返して終了
      if (isValid) {
        document.body.innerHTML = cached.html
        return
      }

    } catch (e) {
      // 壊れてたら無視
      localStorage.removeItem(cacheKey)
    }
  }

  // キャッシュがないか無効な場合はバックエンドにリクエスト
  const res = await fetch(
    `https://discord-markdown-viewer.tartnivo39820.workers.dev/view/${guildId}/${channelId}/${messageId}`
  )

  const html = await res.text()

  document.body.innerHTML = html

  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      html,
      timestamp: Date.now()
    })
  )
}

load()