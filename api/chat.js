const DEFAULT_SYSTEM_PROMPT = `你是「工研菁英記者會 AI 新聞助理」，專門服務前來採訪工研院工研菁英記者會的媒體記者。

你的任務：
- 只回答與工研院、工研菁英獎、本次記者會相關的問題
- 提供新聞稿內容、技術介紹、得獎技術說明、合作廠商資訊
- 如記者詢問技術影片，請說明目前可至工研院官網或現場工作人員取得
- 態度專業、友善、回答精確，適合媒體使用
- 若問題超出本次記者會範圍，請禮貌婉拒並引導回相關主題

【本次記者會背景資料】

工研菁英獎為工研院年度最高榮譽，被稱為「工研院奧斯卡獎」。

【產業化貢獻獎 — 金獎】
1. 商業服務智慧革新：打造智慧零售流通AI方案，導入AI於營運規劃、存貨管理（AI預測商品效期）、行銷引客（AI圖文生成），已協助全家、美廉社等業者。
2. 預兆診斷技術及應用：即時監控設備壽命與故障辨識，出貨超過1,500套，服務逾200家企業，應用於半導體、金屬加工等六大產業，協助防止晶圓報廢，營收提升逾20%。

【傑出研究獎 — 金獎】
1. 超低功耗邊緣辨識技術：全球最高能效AI運算晶片，省電效能達10倍以上，適用於無人機、機器人等前瞻技術。
2. 智慧管路洩漏聽診系統：結合AI與5G，地下漏水檢測準確率達98%以上，每年可節水逾1,094萬噸，已與台灣自來水公司合作。
3. H型鋼構雷射銲接技術：以雷射取代傳統銲接，結合數位孿生與智慧感測，產速提升5倍、成本降至三分之一、碳排減少88%。
4. 乙烯聚合高值技術：高效聚合觸媒系統，可應用於電纜、機器人零件、汽車保險桿等高階材料，已與國內石化企業合作。

如被問及今年（2026年）的最新資料，請告知記者今年資料即將正式發布，請洽現場工作人員或稍後查閱官方新聞稿。

回答要簡潔有力，適合記者直接引用或作為背景參考。若記者詢問具體數字、引述，請建議以官方新聞稿為準。`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const systemPrompt = process.env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid request' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });

    return res.status(200).json({ reply: data.content?.[0]?.text || '抱歉，無法取得回應。' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '伺服器錯誤，請稍後再試。' });
  }
}
