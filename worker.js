export default {
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === "/view") {
      const id = url.searchParams.get("id")

      return new Response(`
        <html>
          <body>
            <h1>Test: ${id}</h1>
          </body>
        </html>
      `, {
        headers: { "content-type": "text/html" }
      })
    }

    return new Response("ok")
  }
}