export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminPassword = process.env.ADMIN_PASSWORD;
  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!adminPassword || !vercelToken || !projectId) {
    return res.status(500).json({ error: '後台環境變數未設定完整' });
  }

  const { password, systemPrompt } = req.body;

  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: '密碼錯誤' });
  }

  if (!systemPrompt || systemPrompt.trim().length < 10) {
    return res.status(400).json({ error: '內容不可為空' });
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: 'SYSTEM_PROMPT',
          value: systemPrompt.trim(),
          type: 'plain',
          target: ['production', 'preview']
        })
      }
    );

    if (response.status === 409) {
      const listRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env`,
        { headers: { 'Authorization': `Bearer ${vercelToken}` } }
      );
      const listData = await listRes.json();
      const existing = listData.envs?.find(e => e.key === 'SYSTEM_PROMPT');

      if (existing) {
        const updateRes = await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${vercelToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              value: systemPrompt.trim(),
              target: ['production', 'preview']
            })
          }
        );
        if (!updateRes.ok) {
          const e = await updateRes.json();
          return res.status(500).json({ error: e.error?.message || '更新失敗' });
        }
      }
    } else if (!response.ok) {
      const e = await response.json();
      return res.status(500).json({ error: e.error?.message || '儲存失敗' });
    }

    const redeployRes = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'itri-press-ai-v2',
          target: 'production',
          source: 'api'
        })
      }
    );

    return res.status(200).json({ success: true, message: '內容已更新，約 30 秒後生效' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '操作失敗，請稍後再試' });
  }
}
