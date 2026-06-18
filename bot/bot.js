import { verifyKey } from "discord-interactions"


export default {
  async fetch(req,env) {
    // 署名の検証に必要なヘッダーを取得
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");

    // 署名の検証にはリクエストの生のボディが必要
    const body = await req.text();

    // 署名の検証
    const isValid = await verifyKey(
      body,
      signature,
      timestamp,
      env.DISCORD_PUBLIC_KEY
    );

    // 署名が無効な場合は401 Unauthorizedを返す
    if (!isValid) {
      console.log("invalid request signature", { signature, timestamp })
      return new Response("Bad request signature", {
        status: 401,
      });
    }

    // リクエストの内容をJSONとしてパース
    const interaction = JSON.parse(body);

    // DiscordのPING
    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    // アプリケーションコマンドの処理
    if (
      interaction.type === 2 &&
      interaction.data.type === 3 &&
      interaction.data.name === "md"
    ) {
      // メッセージのIDを取得
      const guildId = interaction.guild_id;
      const channelId = interaction.channel_id;
      const messageId = interaction.data.target_id;
      
      if (!messageId) {
        console.log("message id is missing in interaction", interaction)
        return Response.json({
          type: 4,
          data: {
            content:
              "❌ メッセージIDが取得できませんでした。メッセージを右クリックして「アプリケーションコマンド」から実行してください。",
          },
        });
      }

      // Discord Markdown ViewerのURLを生成
      const url =
        `https://discord-markdown-viewer.pages.dev/view/${guildId}/${channelId}/${messageId}`

      // 生成したURLを返信
      return Response.json({
        type: 4,
        data: {
          content: `📄 ${url}`,
          reply: {
            message_reference: {
              message_id: messageId,
            },
          }
        }
      })
    }

    // その他のリクエストには400 Bad Requestを返す
    return new Response("Bad request", {
      status: 400,
    });
  }
}
