const API_URL = import.meta.env.VITE_API_URL;

export async function translateBatch(texts: string[], target: string) {
  if (!texts.length) return texts;

  try {
    const res = await fetch(`${API_URL}/api/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts,
        target,
        source: "en",
      }),
    });

    if (!res.ok) return texts;

    const data = await res.json();
    return data.translations;
  } catch (err) {
    console.error("Translation error:", err);
    return texts;
  }
}