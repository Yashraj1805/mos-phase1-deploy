"""
Scenario / pattern analysis — deterministic signals + Scenario Engine LLM.

Two-layer design:
  1. Deterministic signals + simple-rule patterns (computed in code, always
     correct, no LLM needed): repeated_intent, abandoned_conversations,
     ghosting_majority, spam_cluster, policy_violation_repeat.
  2. Scenario Engine LLM (`scenario_engine` agent): reads the deterministic
     signals + a sample of recent agent outputs + recent conversation turns
     and proposes concrete artifact-level changes (FAQs, qualification
     questions, prompt clarifications, do_not_say entries).

Each LLM-detected pattern is persisted to the `scenario_updates` table with
status="pending" so the operator can review and apply them later.
"""
from collections import Counter
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.agents.scenario.scenario_agent import ScenarioAgent
from app.db import models
from app.schemas.agent_schema import BusinessConfig
from app.schemas.scenario_schema import ScenarioAnalyzeRequest


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


class ScenarioService:
    @staticmethod
    def analyze(payload: ScenarioAnalyzeRequest, db: Session) -> dict:
        tenant_id = payload.tenant_id

        # --- 1. Deterministic signals ----------------------------------------
        convs = (
            db.query(models.Conversation)
            .join(models.Customer)
            .filter(models.Customer.tenant_id == tenant_id)
            .all()
        )
        abandoned = 0
        single_message = 0
        for conv in convs:
            turns = (
                db.query(models.ConversationTurn)
                .filter_by(conversation_id=conv.id)
                .all()
            )
            if not any(t.role == "assistant" for t in turns):
                abandoned += 1
            if len(turns) <= 1:
                single_message += 1

        analytics_rows = (
            db.query(models.AgentOutput)
            .join(models.ConversationTurn, models.AgentOutput.turn_id == models.ConversationTurn.id)
            .join(models.Conversation, models.ConversationTurn.conversation_id == models.Conversation.id)
            .join(models.Customer, models.Conversation.customer_id == models.Customer.id)
            .filter(
                models.Customer.tenant_id == tenant_id,
                models.AgentOutput.agent_name == "analytics_ai",
            )
            .all()
        )
        intents: Counter = Counter()
        intent_action_pairs: Counter = Counter()
        for ao in analytics_rows:
            data = ao.structured_data or {}
            intent = data.get("intent")
            action = data.get("recommended_action")
            if intent:
                intents[intent] += 1
            if intent and action:
                intent_action_pairs[f"{intent} -> {action}"] += 1

        sales_rows = (
            db.query(models.AgentOutput)
            .join(models.ConversationTurn, models.AgentOutput.turn_id == models.ConversationTurn.id)
            .join(models.Conversation, models.ConversationTurn.conversation_id == models.Conversation.id)
            .join(models.Customer, models.Conversation.customer_id == models.Customer.id)
            .filter(
                models.Customer.tenant_id == tenant_id,
                models.AgentOutput.agent_name == "sales_ai",
            )
            .all()
        )
        violation_phrases: Counter = Counter()
        for ao in sales_rows:
            for phrase in (ao.structured_data or {}).get("policy_violations") or []:
                violation_phrases[phrase] += 1

        signals = {
            "top_intents": _top(intents, "intent"),
            "top_intent_action_pairs": _top(intent_action_pairs, "pair"),
            "abandoned_conversations": abandoned,
            "single_message_conversations": single_message,
            "total_conversations_analyzed": len(convs),
            "policy_violation_phrases": _top(violation_phrases, "phrase"),
        }

        # --- 2. Deterministic patterns + recommendations --------------------
        deterministic_patterns: List[Dict[str, Any]] = []
        deterministic_recs: List[str] = []
        if intents:
            top_intent, top_count = intents.most_common(1)[0]
            if top_count >= 3:
                deterministic_patterns.append(
                    {"pattern": "repeated_intent", "intent": top_intent, "count": top_count}
                )
                deterministic_recs.append(
                    f"'{top_intent}' is the dominant intent ({top_count}x) — add a pinned FAQ or canned sales reply."
                )
        if abandoned:
            deterministic_patterns.append({"pattern": "abandoned_conversations", "count": abandoned})
            deterministic_recs.append(
                f"{abandoned} conversation(s) ended without an assistant reply — check the agent pipeline."
            )
        if single_message and single_message > len(convs) // 2 and len(convs) >= 4:
            deterministic_patterns.append({"pattern": "ghosting_majority", "count": single_message})
            deterministic_recs.append(
                "Most conversations are one-message inquiries — opening reply may be too generic."
            )
        if intents.get("spam", 0) >= 2:
            deterministic_patterns.append({"pattern": "spam_cluster", "count": intents.get("spam", 0)})
            deterministic_recs.append(
                f"{intents.get('spam',0)} spam-like leads detected — consider source-based filtering."
            )
        if violation_phrases:
            top_phrase, n = violation_phrases.most_common(1)[0]
            deterministic_patterns.append(
                {"pattern": "policy_violation_repeat", "phrase": top_phrase, "count": n}
            )
            deterministic_recs.append(
                f"Sales agent kept drafting the restricted phrase '{top_phrase}' ({n}x) — strengthen do_not_say guidance."
            )

        # --- 3. Scenario Engine LLM -----------------------------------------
        business_config = _resolve_business_config(tenant_id, db)

        sample_outputs = [
            {
                "agent": ao.agent_name,
                "intent": (ao.structured_data or {}).get("intent"),
                "category": (ao.structured_data or {}).get("category"),
                "recommended_action": (ao.structured_data or {}).get("recommended_action"),
                "issue_type": (ao.structured_data or {}).get("issue_type"),
                "response_text": ((ao.structured_data or {}).get("response_text") or "")[:200],
                "policy_violations": (ao.structured_data or {}).get("policy_violations"),
            }
            for ao in (analytics_rows + sales_rows)[:20]
        ]
        recent_turns_rows = (
            db.query(models.ConversationTurn)
            .join(models.Conversation, models.ConversationTurn.conversation_id == models.Conversation.id)
            .join(models.Customer, models.Conversation.customer_id == models.Customer.id)
            .filter(models.Customer.tenant_id == tenant_id)
            .order_by(models.ConversationTurn.id.desc())
            .limit(30)
            .all()
        )
        sample_turns = [
            {"role": t.role, "message": (t.message or "")[:250]}
            for t in reversed(recent_turns_rows)
        ]

        scenario_envelope = ScenarioAgent.run(
            business_config, signals, sample_outputs, sample_turns
        )
        scenario_block = scenario_envelope.model_dump()

        # --- 4. Persist each LLM pattern to scenario_updates ---------------
        persisted_ids: List[int] = []
        if scenario_envelope.success and isinstance(scenario_envelope.data, dict):
            llm_patterns = scenario_envelope.data.get("patterns_detected") or []
            llm_recs = scenario_envelope.data.get("recommendations") or []
            llm_faqs = scenario_envelope.data.get("new_faq_candidates") or []
            for p in llm_patterns:
                if not isinstance(p, dict) or not p.get("pattern"):
                    continue
                try:
                    row = models.ScenarioUpdate(
                        tenant_id=tenant_id,
                        pattern_detected=str(p.get("pattern", ""))[:1000],
                        suggested_improvements={
                            "severity": p.get("severity"),
                            "evidence": p.get("evidence"),
                            # Recs + FAQ candidates are global to this scenario
                            # run, not per-pattern, so attach them once to each
                            # row for full traceability.
                            "recommendations": llm_recs,
                            "new_faq_candidates": llm_faqs,
                        },
                        status="pending",
                    )
                    db.add(row)
                    db.flush()
                    persisted_ids.append(row.id)
                except Exception:
                    db.rollback()
            try:
                db.commit()
            except Exception:
                db.rollback()

        return {
            "tenant_id": tenant_id,
            "status": "ok",
            "patterns": deterministic_patterns,
            "recommendations": deterministic_recs,
            "raw_signals": signals,
            "scenario_engine": scenario_block,
            "persisted_scenario_update_ids": persisted_ids,
        }
