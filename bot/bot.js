export default {
  async fetch(req) {
    const body = await req.json()

    const guildId = body.guild_id
    const channelId = body.channel_id

    // 返信先メッセージID（ここが重要）
    const messageId =
      body.message?.message_reference?.message_id;
      
    if (!messageId) {
      return Response.json({
        type: 4,
        data: {
          content: "❌ 返信先メッセージが見つかりません"
        }
      })
    }

    const url =
      `https://discord-markdown-viewer.pages.dev/view/${guildId}/${channelId}/${messageId}`

    return Response.json({
      type: 4,
      data: {
        content: `📄 ${url}`
      }
    })
  }
}