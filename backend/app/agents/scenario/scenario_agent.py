"""
Scenario Engine — the LEARNING / IMPROVEMENT layer.

Reads deterministic activity signals + sample agent outputs + sample
conversation turns and proposes concrete artifact-level changes (FAQs,
qualification questions, objection handlers, do_not_say entries, prompt
clarifications). Distinct from Manager AI: Manager makes ops-level business
recommendations; Scenario Engine writes back into the configuration / prompts
that future runs will use.

Like Manager, this is a supervisory agent — it takes its own input shape
(not AgentInput) and is invoked by ScenarioService, not by the per-message
orchestrator.
"""
from typing import Any, Dict, List

from app.agents.base import envelope_from_llm, serialize_dict
from app.prompts.loader import load_prompt, wrap_untrusted
from app.schemas.agent_schema import (
    AgentEnvelope,
    BusinessConfig,
    ScenarioAgentData,
)
from app.services.llm.llm_service import generate_json_response

AGENT_NAME = "scenario_engine"

EXPECTED_SCHEMA = """
{
  "agent": "scenario_engine",
  "patterns_detected": [
    {"pattern": "string", "evidence": "string", "severity": "low | medium | high"}
  ],
  "recommendations": [
    {
      "target": "config.faqs | config.qualification_questions | config.objection_handling | config.do_not_say | prompt.sales_system | prompt.support_system | prompt.analytics_system",
      "change": "literal text suggestion the operator can paste in",
      "rationale": "string"
    }
  ],
  "new_faq_candidates": [
    {"question": "string", "suggested_answer": "string"}
  ]
}
""".strip()


def run(
    business_config: BusinessConfig,
    signals: Dict[str, Any],
    sample_outputs: List[Dict[str, Any]],
    sample_turns: List[Dict[str, Any]],
) -> AgentEnvelope:
    system_instruction = load_prompt(
        "scenario_system.txt",
        business_name=business_config.business_name,
        industry=business_config.industry,
        tone=business_config.tone,
        primary_goal=business_config.primary_goal,
        primary_cta=business_config.primary_cta,
    )

    current_config_snapshot = {
        "faqs": business_config.faqs,
        "qualification_questions": business_config.qualification_questions,
        "objection_handling": business_config.objection_handling,
        "do_not_say": business_config.do_not_say,
    }

    user_prompt = load_prompt(
        "scenario_user.txt",
        signals=serialize_dict(signals),
        sample_outputs=wrap_untrusted("sample_outputs", serialize_dict(sample_outputs)),
        sample_turns=wrap_untrusted("sample_turns", serialize_dict(sample_turns)),
        current_config=serialize_dict(current_config_snapshot),
    )

    raw = generate_json_response(
        system_instruction=system_instruction,
        user_prompt=user_prompt,
        expected_schema=EXPECTED_SCHEMA,
        temperature=0.4,
    )
    envelope = envelope_from_llm(AGENT_NAME, raw)
    if not envelope.success:
        return envelope

    try:
        validated = ScenarioAgentData(**(envelope.data or {}))
    except Exception as exc:
        return AgentEnvelope(
            agent=AGENT_NAME,
            success=False,
            error="output_schema_validation_failed",
            error_details=str(exc),
            raw_response=str(envelope.data),
        )

    envelope.data = validated.model_dump()
    return envelope


class ScenarioAgent:
    """Supervisory agent; distinct input shape from runtime sub-agents."""

    name = AGENT_NAME

    @staticmethod
    def run(
        business_config: BusinessConfig,
        signals: Dict[str, Any],
        sample_outputs: List[Dict[str, Any]],
        sample_turns: List[Dict[str, Any]],
    ) -> AgentEnvelope:
        return run(business_config, signals, sample_outputs, sample_turns)
