import json
import httpx
from typing import Optional
from app.config import get_settings

settings = get_settings()

# ---------- Prompt Builder ----------

def build_judge_prompt(case_description: str, prosecution_arg: str, defense_arg: str) -> str:
    return f"""Sen tarafsız ve deneyimli bir mahkeme hakimisin. Görevin aşağıdaki davada iki tarafın argümanlarını değerlendirmek.

DAVA: {case_description}

SAVCI İDDİASI:
{prosecution_arg}

SAVUNMA ARGÜMANI:
{defense_arg}

Değerlendirme Kriterlerin:
1. Mantıksal tutarlılık (argüman kendi içinde çelişiyor mu?)
2. Kanıta dayalı güç (somut delile atıfta bulunuyor mu?)
3. İkna ediciliği (bir jüriyi ikna eder mi?)

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{{"prosecutor_score": 0-100, "defense_score": 0-100, "reasoning": "max 2 cümle Türkçe gerekçe", "advantage": "prosecution veya defense"}}"""


def parse_verdict(raw_text: str) -> dict:
    """Model çıktısından JSON'ı güvenli şekilde parse eder."""
    try:
        # JSON bloğunu bul
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        if start != -1 and end > start:
            data = json.loads(raw_text[start:end])
            p_score = float(data.get("prosecutor_score", 50))
            d_score = float(data.get("defense_score", 50))
            advantage = data.get("advantage", "prosecution" if p_score > d_score else "defense")
            reasoning = data.get("reasoning", "Hakim her iki argümanı da değerlendirdi.")
            # HP delta: kazanan taraf rakibinin HP'sini düşürür
            delta = int(abs(p_score - d_score) / 5)  # Max 20 HP/tur
            return {
                "prosecutor_score": p_score,
                "defense_score": d_score,
                "reasoning": reasoning,
                "advantage": advantage,
                "judge_hp_delta": -delta,  # Hakim sabrı düşüyor (gerilim artıyor)
            }
    except Exception:
        pass
    # Parse başarısız → beraberlik
    return {
        "prosecutor_score": 50.0,
        "defense_score": 50.0,
        "reasoning": "Hakim her iki tarafı da eşit ikna edici buldu.",
        "advantage": "none",
        "judge_hp_delta": -3,
    }


# ---------- Ollama (Yerel LLM) ----------

async def call_ollama(prompt: str) -> str:
    """Yerel Ollama sunucusuna istek atar."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 256},
            },
        )
        response.raise_for_status()
        return response.json().get("response", "")


# ---------- HuggingFace Inference API (Fallback) ----------

async def call_huggingface(prompt: str) -> str:
    """HuggingFace Inference API'ye istek atar (ücretsiz fallback)."""
    model = "mistralai/Mistral-7B-Instruct-v0.3"
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {settings.huggingface_api_key}"}

    formatted_prompt = f"<s>[INST] {prompt} [/INST]"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers=headers,
            json={
                "inputs": formatted_prompt,
                "parameters": {
                    "max_new_tokens": 300,
                    "temperature": 0.3,
                    "return_full_text": False,
                },
            },
        )
        response.raise_for_status()
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            return result[0].get("generated_text", "")
        return ""


# ---------- Ana Değerlendirme Fonksiyonu ----------

async def evaluate_arguments(
    case_description: str,
    prosecution_arg: str,
    defense_arg: str,
) -> dict:
    """
    Savcı ve savunma argümanlarını AI Hakim ile değerlendirir.
    Önce Ollama'yı dener, başarısız olursa HuggingFace'e geçer.
    """
    prompt = build_judge_prompt(case_description, prosecution_arg, defense_arg)

    # 1. Yerel Ollama dene
    try:
        raw = await call_ollama(prompt)
        if raw.strip():
            return parse_verdict(raw)
    except Exception:
        pass  # Ollama çalışmıyor (production ortamı) → fallback

    # 2. HuggingFace Fallback
    try:
        raw = await call_huggingface(prompt)
        if raw.strip():
            return parse_verdict(raw)
    except Exception as e:
        print(f"[AI Judge] HuggingFace hatası: {e}")

    # 3. Her şey başarısız → beraberlik kararı
    return {
        "prosecutor_score": 50.0,
        "defense_score": 50.0,
        "reasoning": "AI Hakim şu an müsait değil. Karar ertelendi.",
        "advantage": "none",
        "judge_hp_delta": 0,
    }
