"""
Manager-style report — deterministic summary + Manager AI recommendations.

`summary` aggregates Lead + Conversation + ConversationTurn + AgentOutput rows
for a tenant entirely in code (so the numbers are always correct, no LLM
hallucination risk). Then ManagerAgent reads that summary plus a few sample
agent outputs and adds `recommendations` + `quality_flags` on top. If the LLM
is unavailable the deterministic summary still ships.
"""
from collections import Counter
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.agents.manager.manager_agent import ManagerAgent
from app.db import models
from app.schemas.agent_schema import BusinessConfig
from app.schemas.report_schema import ReportGenerateRequest


def _top(counter: Counter, key: str, limit: int = 5) -> List[Dict[str, Any]]:
    return [{key: name, "count": count} for name, count in counter.most_common(limit)]


def _resolve_business_config(tenant_id: str, db: Session) -> BusinessConfig:
    row = (
        db.query(models.BusinessConfig)
        .filter(models.BusinessConfig.tenant_id == tenant_id)
        .order_by(models.BusinessConfig.id.desc())
        .first()
    )
    if row and row.config_data:
        try:
            return BusinessConfig(**row.config_data)
        except Exception:
            pass
    return BusinessConfig()


class ReportService:
    @staticmethod
    def generate_report(payload: ReportGenerateRequest, db: Session) -> dict:
        tenant_id = payload.tenant_id

        # --- Deterministic aggregates ---
        leads = db.query(models.Lead).filter_by(tenant_id=tenant_id).all()
        categories: Counter = Counter(L.category for L in leads if L.category)
        lead_intents: Counter = Counter(L.intent for L in leads if L.intent)
        scores = [L.score for L in leads if L.score]
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        agent_rows = (
            db.query(models.AgentOutput)
            .join(
                models.ConversationTurn,
                models.AgentOutput.turn_id == models.ConversationTurn.id,
            )
            .join(
                models.Conversation,
                models.ConversationTurn.conversation_id == models.Conversation.id,
            )
            .join(models.Customer, models.Conversation.customer_id == models.Customer.id)
            .filter(models.Customer.tenant_id == tenant_id)
            .order_by(models.AgentOutput.id.desc())
            .all()
        )

        agent_invocations: Counter = Counter()
        funnel: Counter = Counter()
        policy_violations = 0
        escalations = 0
        issue_types: Counter = Counter()
        for ao in agent_rows:
            agent_invocations[ao.agent_name] += 1
            data = ao.structured_data or {}
            if ao.agent_name == "analytics_ai":
                action = data.get("recommended_action")
                if action:
                    funnel[action] += 1
            if ao.agent_name == "sales_ai" and data.get("policy_violations"):
                policy_violations += len(data["policy_violations"])
            if ao.agent_name == "support_ai":
                if data.get("escalation_required"):
                    escalations += 1
                issue = data.get("issue_type")
                if issue:
                    issue_types[issue] += 1

        total_conversations = (
            db.query(models.Conversation)
            .join(models.Customer)
            .filter(models.Customer.tenant_id == tenant_id)
            .count()
        )
        total_user_turns = (
            db.query(models.ConversationTurn)
            .join(models.Conversation)
            .join(models.Customer)
            .filter(
                models.Customer.tenant_id == tenant_id,
                models.ConversationTurn.role == "user",
            )
            .count()
        )
        total_assistant_turns = (
            db.query(models.ConversationTurn)
            .join(models.Conversation)
            .join(models.Customer)
            .filter(
                models.Customer.tenant_id == tenant_id,
                models.ConversationTurn.role == "assistant",
            )
            .count()
        )

        summary = {
            "total_leads": len(leads),
            "hot_leads": categories.get("hot_lead", 0),
            "warm_leads": categories.get("warm_lead", 0),
            "cold_leads": categories.get("cold_lead", 0),
            "spam": categories.get("spam", 0),
            "avg_lead_score": avg_score,
            "top_intents": _top(lead_intents, "intent"),
            "recommended_action_funnel": dict(funnel),
            "agent_invocations": dict(agent_invocations),
            "policy_violations_detected": policy_violations,
            "support_escalations_required": escalations,
            "top_support_issues": _top(issue_types, "issue_type"),
            "total_conversations": total_conversations,
            "total_user_turns": total_user_turns,
            "total_assistant_turns": total_assistant_turns,
        }

        # --- Manager AI recommendations on top of the deterministic numbers ---
        business_config = _resolve_business_config(tenant_id, db)
        sample_outputs = [
            {
                "agent": ao.agent_name,
                "intent": (ao.structured_data or {}).get("intent"),
                "category": (ao.structured_data or {}).get("category"),
                "recommended_action": (ao.structured_data or {}).get("recommended_action"),
                "issue_type": (ao.structured_data or {}).get("issue_type"),
                "policy_violations": (ao.structured_data or {}).get("policy_violations"),
            }
            for ao in agent_rows[:15]
        ]
        manager_envelope = ManagerAgent.run(business_config, summary, sample_outputs)

        return {
            "tenant_id": tenant_id,
            "status": "ok",
            "summary": summary,
            "manager_ai": manager_envelope.model_dump(),
        }
