const CONFIG_KEY = 'ai_fitness_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';
function decryptConfig(e) { try { const d = CryptoJS.RC4.decrypt(e, DECRYPT_KEY).toString(CryptoJS.enc.Utf8); if (!d) return null; const c = JSON.parse(d); c.modelName = 'GLM-4-Flash'; return c; } catch (e) { return null; } }
async function fetchRemoteConfig() { try { const r = await fetch(REMOTE_CONFIG_URL); if (!r.ok) return null; const d = await r.json(); if (d && d.value) { const c = decryptConfig(d.value); if (c && c.apiUrl && c.apiKey) { localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(c)); return c; } } return null; } catch (e) { return null; } }
function getModelConfig() { try { const u = localStorage.getItem(CONFIG_KEY); if (u) { const p = JSON.parse(u); if (p && p.apiUrl && p.apiKey && p.modelName) return p; } const r = localStorage.getItem(CONFIG_KEY + '_remote'); if (r) return JSON.parse(r); return null; } catch (e) { return null; } }
function saveModelConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }
async function initConfig() { const c = getModelConfig(); if (c) return c; return await fetchRemoteConfig(); }

async function generate(type, options, onMessage, onComplete, onError) {
    let config = getModelConfig(); if (!config || !config.apiUrl || !config.apiKey) config = await fetchRemoteConfig();
    if (!config) { onError(new Error('请先配置模型')); return; }
    const goalMap = { lose: '减脂塑形', muscle: '增肌力量', health: '强身健体', flex: '柔韧拉伸' };
    const levelMap = { beginner: '新手入门', intermediate: '有基础', advanced: '进阶训练' };
    const locMap = { home: '居家（无器械）', gym: '健身房', outdoor: '户外' };
    const prompts = {
        plan: `你是专业健身教练，请制定训练计划：
目标：${goalMap[options.goal]}
时长：${options.duration}分钟
场地：${locMap[options.location]}
水平：${levelMap[options.level]}
${options.extra ? `补充：${options.extra}` : ''}

请输出：
## 🏋️ 训练计划（${options.duration}分钟）

### 热身（5分钟）
（具体动作和时间）

### 正式训练
（每个动作：名称、组数、次数/时间、要点）

### 放松拉伸（5分钟）
（具体拉伸动作）

## 💡 教练提示
（注意事项和建议）`,
        exercise: `请详细讲解健身动作的正确做法：${options.extra || '深蹲'}。包括：动作要领、常见错误、呼吸方法、变式建议。`,
        diet: `请提供一份适合${goalMap[options.goal]}目标的饮食建议，包括：每日热量参考、三餐搭配建议、推荐食物清单。${options.extra ? `需求：${options.extra}` : ''}`
    };
    const controller = new AbortController();
    try {
        const response = await fetch(`${config.apiUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.modelName, messages: [{ role: 'user', content: prompts[type] }], stream: true, temperature: 0.7 }), signal: controller.signal });
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        while (true) { const { done, value } = await reader.read(); if (done) { onComplete(); break; } buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { if (line.startsWith('data: ')) { const data = line.slice(6).trim(); if (data === '[DONE]') { onComplete(); return; } try { const content = JSON.parse(data).choices?.[0]?.delta?.content; if (content) onMessage(content); } catch (e) { } } } }
    } catch (error) { if (error.name !== 'AbortError') onError(error); }
}
window.AIService = { getModelConfig, saveModelConfig, initConfig, generate };
