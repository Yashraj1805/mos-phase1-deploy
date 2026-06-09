import json
from typing import Any, List

from app.schemas.agent_schema import AgentEnvelope


def serialize_history(history: list) -> str:
    if not history:
        return "(no prior conversation)"
    return json.dumps(history, ensure_ascii=False, indent=2)


def serialize_dict(data: Any) -> str:
    if not data:
        return "{}"
    return json.dumps(data, ensure_ascii=False, indent=2)


def envelope_from_llm(agent_name: str, llm_response: Any) -> AgentEnvelope:
    """
    Normalize the raw dict returned by llm_service into an AgentEnvelope.
    llm_service returns {"success": False, "error": ...} on failure,
    otherwise the parsed model output dict.
    """
    if isinstance(llm_response, dict) and llm_response.get("success") is False:
        return AgentEnvelope(
            agent=agent_name,
            success=False,
            error=llm_response.get("error", "unknown_error"),
            error_details=llm_response.get("details"),
            raw_response=llm_response.get("raw_response"),
        )
    if not isinstance(llm_response, dict):
        return AgentEnvelope(
            agent=agent_name,
            success=False,
            error="llm_response_not_dict",
            raw_response=str(llm_response),
        )
    return AgentEnvelope(agent=agent_name, success=True, data=llm_response)


REDACTED_NOTICE = (
    "[REDACTED — generated text contained restricted phrases; "
    "regenerate with stronger guidance.]"
)


def find_do_not_say_violations(response_text: str, do_not_say: List[str]) -> List[str]:
    """Return any configured restricted phrases that appear in response_text."""
    lowered = (response_text or "").lower()
    return [p for p in (do_not_say or []) if p and p.lower() in lowered]


def apply_do_not_say_guard(data: dict, do_not_say: List[str]) -> dict:
    """Redact response_text in place if it violates the do_not_say policy."""
    violations = find_do_not_say_violations(data.get("response_text", ""), do_not_say)
    if violations:
        data["policy_violations"] = violations
        data["response_text"] = REDACTED_NOTICE
    return data
