"""AI Coach: nhận xét bài viết/bài nói của học viên.

- Có GEMINI_API_KEY: gọi Gemini qua REST (httpx).
- Không có key, hoặc gọi lỗi: dùng bộ nhận xét theo luật để hệ thống vẫn chạy được khi demo.
"""
import re
from collections import Counter

import httpx

from app.config import settings

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

_PROMPT = (
    "Bạn là giáo viên tiếng Anh. Hãy nhận xét ngắn gọn bằng tiếng Việt cho bài {kind} sau của học viên, "
    "gồm: (1) điểm mạnh, (2) lỗi cần sửa kèm ví dụ sửa, (3) 2 gợi ý cải thiện. "
    "Không bịa nội dung không có trong bài.\n\n---\n{text}\n---"
)

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "is", "are", "was", "were",
    "i", "it", "that", "this", "for", "with", "as", "at", "be", "have", "has", "my", "you",
}


def rule_based_feedback(kind: str, text: str) -> str:
    sentences = [s for s in re.split(r"[.!?]+\s*", text) if s.strip()]
    words = re.findall(r"[A-Za-z']+", text.lower())
    n_words, n_sent = len(words), max(len(sentences), 1)
    avg_len = n_words / n_sent
    unique_ratio = len(set(words)) / n_words if n_words else 0
    repeated = [
        w for w, c in Counter(w for w in words if w not in _STOPWORDS and len(w) > 3).most_common(3) if c >= 3
    ]

    lines = [f"Nhận xét tự động (theo luật) cho bài {kind}:"]
    lines.append(f"- Độ dài: {n_words} từ, {n_sent} câu, trung bình {avg_len:.1f} từ/câu.")
    if n_words < 60:
        lines.append("- Bài còn ngắn: nên phát triển ý thêm ví dụ hoặc lý do cụ thể.")
    elif n_words > 300:
        lines.append("- Bài khá dài: kiểm tra lại để mỗi đoạn tập trung vào một ý chính.")
    else:
        lines.append("- Độ dài ở mức hợp lý.")
    if avg_len > 28:
        lines.append("- Câu khá dài: thử tách thành các câu ngắn hơn để rõ ý.")
    elif avg_len < 8:
        lines.append("- Câu khá ngắn: thử dùng từ nối (however, because, therefore) để liên kết ý.")
    if unique_ratio < 0.5:
        lines.append("- Vốn từ lặp nhiều: hãy thay thế bằng từ đồng nghĩa.")
    if repeated:
        lines.append(f"- Từ lặp nhiều lần: {', '.join(repeated)}.")
    if text and not text.rstrip().endswith((".", "!", "?")):
        lines.append("- Câu cuối chưa có dấu kết thúc câu.")
    lines.append("- Gợi ý: đọc lại bài thành tiếng, rà soát thì của động từ và mạo từ a/an/the.")
    return "\n".join(lines)


def gemini_feedback(kind: str, text: str) -> str:
    response = httpx.post(
        GEMINI_URL.format(model=settings.gemini_model),
        headers={"x-goog-api-key": settings.gemini_api_key or ""},
        json={"contents": [{"parts": [{"text": _PROMPT.format(kind=kind, text=text)}]}]},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def generate_feedback(kind: str, text: str) -> tuple[str, str]:
    """Trả về (nội dung nhận xét, provider)."""
    if settings.gemini_api_key:
        try:
            return gemini_feedback(kind, text), "gemini"
        except (httpx.HTTPError, KeyError, IndexError, ValueError):
            pass  # rơi xuống bộ nhận xét theo luật
    return rule_based_feedback(kind, text), "rules"
