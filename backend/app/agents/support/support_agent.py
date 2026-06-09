from typing import Union

from app.agents.base import (
    apply_do_not_say_guard,
    envelope_from_llm,
    serialize_dict,
    serialize_history,
)
from app.prompts.loader import load_prompt, wrap_untrusted
from app.schemas.agent_schema import AgentEnvelope, AgentInput, SupportAgentData
from app.services.llm.llm_service import generate_json_response

AGENT_NAME = "support_ai"

EXPECTED_SCHEMA = """
{
  "agent": "support_ai",
  "response_text": "string in the configured business tone",
  "issue_type": "refund | billing | technical_issue | complaint | account | delivery | general_query",
  "escalation_required": false
}
""".strip()


def run(agent_input: AgentInput) -> AgentEnvelope:
    bc = agent_input.business_config

    system_instruction = load_prompt(
        "support_system.txt",
        business_name=bc.business_name,
        industry=bc.industry,
        tone=bc.tone,
        primary_cta=bc.primary_cta,
        faqs=serialize_dict(bc.faqs),
        escalation_rules=serialize_dict(getattr(bc, "escalation_rules", []) or []),
        do_not_say=serialize_dict(bc.do_not_say),
    )

    if agent_input.analytics_signal is not None:
        analytics_block = wrap_untrusted(
            "analytics_signal",
            serialize_dict(agent_input.analytics_signal.model_dump()),
        )
    else:
        analytics_block = "(no analytics signal available)"

    user_prompt = load_prompt(
        "support_user.txt",
        analytics_signal=analytics_block,
        lead_context=wrap_untrusted(
            "lead_context", serialize_dict(agent_input.lead_context.model_dump())
        ),
        conversation_history=wrap_untrusted(
            "conversation_history",
            serialize_history(
                [t.model_dump() for t in agent_input.conversation_history]
            ),
        ),
        customer_message=wrap_untrusted(
            "customer_message", agent_input.customer_message
        ),
    )

    raw = generate_json_response(
        system_instruction=system_instruction,
        user_prompt=user_prompt,
        expected_schema=EXPECTED_SCHEMA,
        temperature=0.3,
    )

    envelope = envelope_from_llm(AGENT_NAME, raw)
    if not envelope.success:
        return envelope

    try:
        validated = SupportAgentData(**(envelope.data or {}))
    except Exception as exc:
        return AgentEnvelope(
            agent=AGENT_NAME,
            success=False,
            error="output_schema_validation_failed",
            error_details=str(exc),
            raw_response=str(envelope.data),
        )

    envelope.data = apply_do_not_say_guard(validated.model_dump(), bc.do_not_say)
    return envelope


class SupportAgent:
    """Backwards-compatible facade. Accepts dict or AgentInput, returns dict."""

    @staticmethod
    def run(agent_input: Union[AgentInput, dict]) -> dict:
        if isinstance(agent_input, dict):
            agent_input = AgentInput(**agent_input)
        return run(agent_input).model_dump()
