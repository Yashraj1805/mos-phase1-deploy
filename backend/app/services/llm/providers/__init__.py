import os
from typing import Any, Dict, Optional, Protocol


class LLMProvider(Protocol):
    def generate_json(
        self,
        system_instruction: str,
        user_prompt: str,
        expected_schema: str,
        temperature: float,
        model: Optional[str],
    ) -> Dict[str, Any]: ...


def get_default_provider() -> LLMProvider:
    name = os.getenv("LLM_PROVIDER", "gemini").lower()
    # Lazy provider imports so the app boots without each vendor's package
    # installed until that provider is actually selected.
    if name == "gemini":
        from app.services.llm.providers.gemini_provider import GeminiProvider

        return GeminiProvider()
    if name == "mock":
        from app.services.llm.providers.mock_provider import MockLLMProvider

        return MockLLMProvider()
    if name == "hybrid":
        from app.services.llm.providers.hybrid_provider import HybridLLMProvider

        return HybridLLMProvider()
    raise ValueError(f"Unsupported LLM provider: {name}")
