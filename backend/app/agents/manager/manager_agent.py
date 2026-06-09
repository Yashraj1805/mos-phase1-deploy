"""
Manager AI — supervisory layer over all sub-agents (analytics, sales, support).

Unlike the runtime sub-agents that the Orchestrator invokes per customer
message with an AgentInput, the Manager AI consumes *aggregate* activity (a
precomputed deterministic `summary` and a few sample agent outputs) and
produces actionable recommendations + quality flags.

Design:
- The `summary` block is computed in code (in ReportService) — never trusted
  to the LLM, so reports stay correct even if the LLM misreads numbers.
- The LLM only writes `recommendations` and `quality_flags`. If the LLM call
  fails (missing key, parse error, etc.) the deterministic summary is still
  returned with an empty recs list and a status flag.
"""
from typing import Any, Dict, List

from app.agents.base import envelope_from_llm, serialize_dict
from app.prompts.loader import load_prompt, wrap_untrusted
from app.schemas.agent_schema import AgentEnvelope, BusinessConfig, ManagerReportData
from app.services.llm.llm_service import generate_json_response

AGENT_NAME = "manager_ai"

EXPECTED_SCHEMA = """
{
  "agent": "manager_ai",
  "summary": { "total_leads": 0, "hot_leads": 0 },
  "recommendations": ["string"],
  "quality_flags": ["string"]
}
""".strip()


def run(
    business_config: BusinessConfig,
    summary: Dict[str, Any],
    sample_outputs: List[Dict[str, Any]],
) -> AgentEnvelope:
    system_instruction = load_prompt(
        "manager_system.txt",
        business_name=business_config.business_name,
        industry=business_config.industry,
        primary_goal=business_config.primary_goal,
        primary_cta=business_config.primary_cta,
    )
    user_prompt = load_prompt(
        "manager_user.txt",
        summary=serialize_dict(summary),
        sample_outputs=wrap_untrusted(
            "sample_outputs", serialize_dict(sample_outputs)
        ),
    )

    raw = generate_json_response(
        system_instruction=system_instruction,
        user_prompt=user_prompt,
        expected_schema=EXPECTED_SCHEMA,
        temperature=0.4,
    )
    envelope = envelope_from_llm(AGENT_NAME, raw)

    recommendations: List[str] = []
    quality_flags: List[str] = []
    status = "ok"

    if envelope.success:
        try:
            validated = ManagerReportData(**(envelope.data or {}))
            recommendations = validated.recommendations
            quality_flags = validated.quality_flags
        except Exception:
            status = "llm_output_invalid"
    else:
        status = "llm_unavailable"

    # Authoritative shape: deterministic summary + best-effort LLM extras.
    data = ManagerReportData(
        summary=summary,
        recommendations=recommendations,
        quality_flags=quality_flags,
    ).model_dump()
    if status != "ok":
        data["recommendations_status"] = status
        if envelope.error:
            data["llm_error"] = envelope.error
        if envelope.error_details:
            data["llm_error_details"] = envelope.error_details

    return AgentEnvelope(agent=AGENT_NAME, success=True, data=data)


class ManagerAgent:
    """Supervisory-layer agent; distinct input shape from runtime sub-agents."""

    name = AGENT_NAME

    @staticmethod
    def run(
        business_config: BusinessConfig,
        summary: Dict[str, Any],
        sample_outputs: List[Dict[str, Any]],
    ) -> AgentEnvelope:
        return run(business_config, summary, sample_outputs)
