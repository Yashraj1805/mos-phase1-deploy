# backend/app/services/orchestrator/orchestrator_service.py
import json
import traceback
from uuid import uuid4
from sqlalchemy.orm import Session
from app.db import models
from app.schemas.chat_schema import ChatMessageRequest
from app.agents.analytics.analytics_agent import AnalyticsAgent
from app.agents.sales.sales_agent import SalesAgent
from app.agents.support.support_agent import SupportAgent

_SUPPORT_TRIGGERS = {"support_routing"}


def _flatten_envelope(envelope: dict) -> dict:
    """Agents return an AgentEnvelope {agent, success, data, error, ...}; the
    actual fields the orchestrator reads (score/intent/response_text/...) live
    in `data`. Flatten them up on success so .get() lookups work, while keeping
    the agent name and success flag visible for downstream logic."""
    if isinstance(envelope, dict) and envelope.get("success") and isinstance(envelope.get("data"), dict):
        return {"agent": envelope.get("agent"), "success": True, **envelope["data"]}
    return envelope


class OrchestratorService:
    """
    Backend orchestration controller layer.
    Manages state, invokes specialized AI agents sequentially, 
    and handles data lifecycle persistence to SQLite with defensive error boundaries.
    """

    @staticmethod
    def process_chat_message(payload: ChatMessageRequest, db: Session) -> dict:
        tenant_id = payload.tenant_id
        customer_id = payload.customer_id
        conversation_id = payload.conversation_id or f"conv_{uuid4().hex[:8]}"
        customer_message = payload.message

        print(f"\n⚡ [Orchestrator] Processing message for Tenant: {tenant_id}, Customer: {customer_id}")

        # 1. Fetch Tenant and Business Configuration from Database safely
        try:
            tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
            if not tenant:
                tenant = models.Tenant(id=tenant_id, name=f"Auto Generated Tenant {tenant_id}")
                db.add(tenant)
                db.commit()
        except Exception as db_err:
            print(f"⚠️ Tenant setup DB warning: {db_err}")
            db.rollback()

        business_config = {
            "business_name": "Generic Corporate Shell",
            "industry": "Consulting Services",
            "primary_goal": "Drive discovery call bookings",
            "primary_cta": "https://calendly.com/mos-demo",
            "tone": "Professional English",
            "products": [{"name": "AI Solutions Automation Pack", "price": "$1500"}],
            "qualification_questions": ["What is your target timeline?", "What is your budget range?"],
            "objection_handling": [{"objection": "Too expensive", "response": "Highlight long-term ROI metrics."}],
            "do_not_say": ["free trials forever"]
        }

        try:
            config_record = db.query(models.BusinessConfig).filter(
                models.BusinessConfig.tenant_id == tenant_id
            ).order_by(models.BusinessConfig.id.desc()).first()
            if config_record and config_record.config_data:
                business_config = config_record.config_data
        except Exception as db_err:
            print(f"⚠️ Config fetch DB warning: {db_err}")

        # 2. Assert Customer, Conversation Session States safely
        try:
            customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
            if not customer:
                customer = models.Customer(id=customer_id, tenant_id=tenant_id, name="Valued Prospect")
                db.add(customer)

            conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
            if not conversation:
                conversation = models.Conversation(id=conversation_id, customer_id=customer_id, status="active")
                db.add(conversation)
            db.commit()
        except Exception as db_err:
            print(f"⚠️ Session state DB warning: {db_err}")
            db.rollback()

        # 3. Log Incoming Customer Message Turn to DB
        user_turn_id = None
        try:
            user_turn = models.ConversationTurn(
                conversation_id=conversation_id,
                role="user",
                message=customer_message
            )
            db.add(user_turn)
            db.commit()
            user_turn_id = user_turn.id
        except Exception as db_err:
            print(f"⚠️ User turn log DB warning: {db_err}")
            db.rollback()

        # 4. Reconstruct History payload stack
        conversation_history = []
        try:
            turns_history = db.query(models.ConversationTurn).filter(
                models.ConversationTurn.conversation_id == conversation_id
            ).order_by(models.ConversationTurn.id.asc()).all()
            conversation_history = [{"role": t.role, "message": t.message} for t in turns_history]
        except Exception as db_err:
            print(f"⚠️ History fetch DB warning: {db_err}")
            conversation_history = [{"role": "user", "message": customer_message}]

        lead_context = {
            "source": "integrated_chat_widget",
            "customer_id": customer_id,
            "conversation_id": conversation_id
        }

        agent_input = {
            "tenant_id": tenant_id,
            "customer_message": customer_message,
            "business_config": business_config,
            "lead_context": lead_context,
            "conversation_history": conversation_history[:-1] if len(conversation_history) > 1 else []
        }

        # 5. EXECUTE AGENT STEP 1: Analytics AI
        print("🤖 [Orchestrator] Invoking AnalyticsAgent...")
        try:
            analytics_res = AnalyticsAgent.run(agent_input)
            if isinstance(analytics_res, str):
                analytics_res = json.loads(analytics_res)
            elif hasattr(analytics_res, "model_dump"):
                analytics_res = analytics_res.model_dump()
            elif not isinstance(analytics_res, dict):
                analytics_res = dict(analytics_res)
            analytics_res = _flatten_envelope(analytics_res)
        except Exception as err:
            print(f"❌ AnalyticsAgent execution failed: {err}")
            traceback.print_exc()
            analytics_res = {
                "agent": "analytics_ai", "score": 50, "intent": "unknown", 
                "category": "warm_lead", "recommended_action": "sales_followup", "error": str(err)
            }

        # 6. Synchronize Lead parameters based on Analytics findings safely
        try:
            lead = db.query(models.Lead).filter(
                models.Lead.tenant_id == tenant_id, models.Lead.customer_id == customer_id
            ).first()
            if not lead:
                lead = models.Lead(tenant_id=tenant_id, customer_id=customer_id)
                db.add(lead)
                
            lead.score = int(analytics_res.get("score", 50))
            lead.intent = str(analytics_res.get("intent", "general_query"))
            lead.category = str(analytics_res.get("category", "warm_lead"))
            db.commit()
        except Exception as db_err:
            print(f"⚠️ Lead sync DB warning: {db_err}")
            db.rollback()

        # Log Analytics outputs safely
        if user_turn_id:
            try:
                analytics_log = models.AgentOutput(
                    turn_id=user_turn_id,
                    agent_name="analytics_ai",
                    structured_data=analytics_res
                )
                db.add(analytics_log)
                db.commit()
            except Exception as db_err:
                print(f"⚠️ Analytics output log DB warning: {db_err}")
                db.rollback()

        # Update input payload before Sales step
        agent_input["lead_context"]["analytics"] = analytics_res
        agent_input["conversation_history"] = conversation_history

        # 7. EXECUTE AGENT STEP 2: Sales AI or Support AI based on analytics routing
        routed_to = "sales_ai"
        if analytics_res.get("recommended_action") in _SUPPORT_TRIGGERS:
            routed_to = "support_ai"
        print(f"🤖 [Orchestrator] Invoking {routed_to} (action={analytics_res.get('recommended_action')})...")
        try:
            if routed_to == "support_ai":
                sales_res = SupportAgent.run(agent_input)
            else:
                sales_res = SalesAgent.run(agent_input)
            if isinstance(sales_res, str):
                sales_res = json.loads(sales_res)
            elif hasattr(sales_res, "model_dump"):
                sales_res = sales_res.model_dump()
            elif not isinstance(sales_res, dict):
                sales_res = dict(sales_res)
            sales_res = _flatten_envelope(sales_res)
            response_text = sales_res.get("response_text", "Thank you for reaching out. Let's connect soon.")
        except Exception as err:
            print(f"❌ {routed_to} execution failed: {err}")
            traceback.print_exc()
            sales_res = {"agent": routed_to, "response_text": "System processing request. Let's touch base shortly.", "error": str(err)}
            response_text = sales_res["response_text"]

        # 8. Log Outgoing Assistant Message Turn safely
        assistant_turn_id = None
        try:
            assistant_turn = models.ConversationTurn(
                conversation_id=conversation_id,
                role="assistant",
                message=response_text
            )
            db.add(assistant_turn)
            db.commit()
            assistant_turn_id = assistant_turn.id
        except Exception as db_err:
            print(f"⚠️ Assistant turn log DB warning: {db_err}")
            db.rollback()

        if assistant_turn_id:
            try:
                sales_log = models.AgentOutput(
                    turn_id=assistant_turn_id,
                    agent_name=routed_to,
                    structured_data=sales_res
                )
                db.add(sales_log)
                db.commit()
            except Exception as db_err:
                print(f"⚠️ {routed_to} output log DB warning: {db_err}")
                db.rollback()

        print("✨ [Orchestrator] Execution finished successfully.")

        return {
            "conversation_id": conversation_id,
            "response_text": response_text,
            "agent": routed_to,
            "intent": analytics_res.get("intent", "unknown"),
            "analytics": {
                "score": analytics_res.get("score", 50),
                "category": analytics_res.get("category", "warm_lead"),
                "recommended_action": str(analytics_res.get("recommended_action", "sales_followup")),
                # Rich-mode fields — pass through when present
                "sentiment": analytics_res.get("sentiment"),
                "urgency": analytics_res.get("urgency"),
                "buying_signals": analytics_res.get("buying_signals") or [],
                "objections_detected": analytics_res.get("objections_detected") or [],
                "estimated_deal_value": analytics_res.get("estimated_deal_value"),
                "confidence": analytics_res.get("confidence"),
                "tags": analytics_res.get("tags") or [],
            }
        }