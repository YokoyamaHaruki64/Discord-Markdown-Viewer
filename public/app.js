const params = new URLSearchParams(location.search)
const id = params.get("id")

async function load() {
  if (!id) {
    document.body.innerHTML = "no id"
    return
  }

  const cached = localStorage.getItem(id)
  if (cached) {
    document.body.innerHTML = cached
    return
  }

  const res = await fetch(`https://YOUR_WORKER_URL/view?id=${id}`)
  const html = await res.text()

  document.body.innerHTML = html
  localStorage.setItem(id, html)
}

load()