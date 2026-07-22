import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
  const key = process.env.GEMINI_API_KEY || settings?.geminiApiKey;

  console.log('Testing Key:', key ? `${key.substring(0, 8)}...` : 'NONE');

  const testModels = [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-pro-latest',
    'gemini-flash-lite-latest',
  ];

  for (const model of testModels) {
    console.log(`\nTesting generateContent for model: "${model}"...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key!)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Chào bạn, trả lời ngắn gọn: Bạn là ai?' }] }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ SUCCESS [${model}]:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
    } else {
      const errText = await res.text();
      console.log(`❌ FAILED [${model}] status ${res.status}:`, errText);
    }
  }
}

main().catch(console.error);
