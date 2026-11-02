"""AI gateway.

LLMs never write canonical scores, DNA, or health pillars.
They produce candidates (chat, questions, lesson plans) that must pass validators.
"""

from __future__ import annotations

import json
import time
from typing import Any

import httpx

from app.core.config import Settings


class AiGateway:
    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def live(self) -> bool:
        return bool(self.settings.openai_api_key)

    def complete(self, *, feature: str, system: str, user: str, json_mode: bool = False) -> dict[str, Any]:
        started = time.perf_counter()
        if not self.live:
            text = self._fallback(feature, user)
            return {
                "text": text,
                "model": "deterministic-fallback",
                "feature": feature,
                "latency_ms": int((time.perf_counter() - started) * 1000),
                "prototype": True,
            }

        headers = {"Authorization": f"Bearer {self.settings.openai_api_key}"}
        payload: dict[str, Any] = {
            "model": self.settings.openai_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": self.settings.ai_max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        with httpx.Client(timeout=60.0) as client:
            res = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()

        text = data["choices"][0]["message"]["content"]
        return {
            "text": text,
            "model": self.settings.openai_model,
            "feature": feature,
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "prototype": False,
            "usage": data.get("usage"),
        }

    def _fallback(self, feature: str, user: str) -> str:
        if feature == "mentor":
            return (
                "I am MediXO Mentor in prototype mode (no live model configured). "
                "Stay with University and Competitive as separate tracks. "
                f"You asked: {user[:280]}"
            )
        if feature == "executive":
            return json.dumps(
                {
                    "title": "Institution overview (prototype)",
                    "summary": "Connect OPENAI_API_KEY for live executive answers. Health pillars stay rule-based.",
                    "insights": [],
                    "recommendations": ["Review at-risk attendance", "Close midsem paper drafts"],
                }
            )
        if feature == "question_studio":
            return json.dumps({"questions": [], "notice": "Live generation requires OPENAI_API_KEY."})
        if feature == "teaching_studio":
            return "Lesson outline unavailable until an AI provider key is configured."
        return "AI feature is in deterministic fallback mode."
