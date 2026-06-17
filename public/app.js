// URLからidを取得して、Discord Markdown ViewerのAPIにリクエストを送信し、結果を表示するコード。キャッシュがある場合はそれを使用し、なければAPIから取得。

// URLSearchParams : URLのクエリパラメータを簡単に扱うためのWeb API。
// location.search : 現在のURLのクエリ文字列を取得するプロパティ。
// get() : 指定したキーに対応する値を取得するメソッド。
const params = new URLSearchParams(location.search)
const id = params.get("id")

async function load() {
  // idが存在しない場合はエラーメッセージを表示して終了
  // ?以降のクエリパラメータにidが含まれていない場合、idはnullとなる
  if (!id) {
    document.body.innerHTML = "no id"
    return
  }

  // localStorageからキャッシュを取得
  const cached = localStorage.getItem(id)
  if (cached) {
    document.body.innerHTML = cached
    return
  }

  // Discord Markdown ViewerのAPIにリクエストを送信
  const res = await fetch(`https://discord-markdown-viewer.tartnivo39820.workers.dev/view?id=${id}`)
  const html = await res.text()

  // 取得したHTMLを表示し、localStorageにキャッシュとして保存
  document.body.innerHTML = html
  localStorage.setItem(id, html)
}
// ページが読み込まれたときにload関数を実行
load()