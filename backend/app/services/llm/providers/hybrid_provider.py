"""
Hybrid LLM provider — tries Gemini first, falls back to MockLLMProvider on
any failure (503 high demand / quota / network / parsing). Best of both:
real variable responses when possible, deterministic demo-safe responses
when Gemini is unavailable.

Selected via `LLM_PROVIDER=hybrid` in `.env`.
"""
import os
from typing import Any, Dict, Optional


class HybridLLMProvider:
    def __init__(self):
        # Lazy-import so Gemini SDK absence doesn't break anything else.
        from app.services.llm.providers.gemini_provider import GeminiProvider
        from app.services.llm.providers.mock_provider import MockLLMProvider
        self._gemini = GeminiProvider()
        self._mock = MockLLMProvider()
        # If the Gemini call fails this many times in a row, skip directly to
        # mock for subsequent calls until we get a successful Gemini call.
        self._consecutive_failures = 0
        self._failure_threshold = int(os.getenv("HYBRID_FAILURE_THRESHOLD", "3"))

    def generate_json(
        self,
        system_instruction: str,
        user_prompt: str,
        expected_schema: str,
        temperature: float = 0.2,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Skip Gemini entirely if we've been failing — saves demo time.
        if self._consecutive_failures < self._failure_threshold:
            result = self._gemini.generate_json(
                system_instruction=system_instruction,
                user_prompt=user_prompt,
                expected_schema=expected_schema,
                temperature=temperature,
                model=model,
            )
            if not (isinstance(result, dict) and result.get("success") is False):
                # Gemini succeeded — reset counter and return.
                self._consecutive_failures = 0
                return result
            self._consecutive_failures += 1
            print(
                f"[hybrid] Gemini failed ({result.get('error')}); "
                f"fallback to mock (consecutive failures: {self._consecutive_failures})"
            )

        # Mock fallback.
        return self._mock.generate_json(
            system_instruction=system_instruction,
            user_prompt=user_prompt,
            expected_schema=expected_schema,
            temperature=temperature,
            model=model,
        )
