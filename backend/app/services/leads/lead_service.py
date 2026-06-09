import uuid

from sqlalchemy.orm import Session

from app.db import models
from app.schemas.lead_schema import LeadCreate


class LeadService:
    """Inbound-lead persistence.

    A /leads/create call:
      1. Auto-creates the Tenant if missing.
      2. Reuses an existing Customer keyed by (tenant_id, name, source) so
         the same person submitting multiple inquiries doesn't duplicate.
      3. Always creates a fresh Lead row in 'new' status — each submission is
         a new lead intake event even if the customer already exists.
      4. Reuses an active Conversation for that customer if one is open,
         otherwise starts a new one.
      5. Appends the inbound message as the next user turn so the orchestrator
         has the conversation history when /chat/message takes over.
    """

    @staticmethod
    def create_lead(payload: LeadCreate, db: Session) -> dict:
        tenant = db.get(models.Tenant, payload.tenant_id)
        if tenant is None:
            db.add(models.Tenant(id=payload.tenant_id, name=payload.tenant_id))
            db.flush()

        contact_info = f"source:{payload.source}"

        # Dedup customers by (tenant_id, name, source).
        customer = (
            db.query(models.Customer)
            .filter(
                models.Customer.tenant_id == payload.tenant_id,
                models.Customer.name == payload.name,
                models.Customer.contact_info == contact_info,
            )
            .order_by(models.Customer.created_at.desc())
            .first()
        )
        customer_reused = customer is not None
        if customer is None:
            customer = models.Customer(
                id=uuid.uuid4().hex,
                tenant_id=payload.tenant_id,
                name=payload.name,
                contact_info=contact_info,
            )
            db.add(customer)
            db.flush()

        # New Lead row per submission (each is a fresh intake event).
        lead = models.Lead(
            tenant_id=payload.tenant_id,
            customer_id=customer.id,
            status="new",
        )
        db.add(lead)

        # Reuse an active Conversation for this customer if one exists;
        # otherwise start a fresh one.
        conversation = (
            db.query(models.Conversation)
            .filter(
                models.Conversation.customer_id == customer.id,
                models.Conversation.status == "active",
            )
            .order_by(models.Conversation.created_at.desc())
            .first()
        )
        conversation_reused = conversation is not None
        if conversation is None:
            conversation = models.Conversation(
                id=uuid.uuid4().hex, customer_id=customer.id
            )
            db.add(conversation)
            db.flush()

        db.add(
            models.ConversationTurn(
                conversation_id=conversation.id,
                role="user",
                message=payload.message,
            )
        )

        db.commit()
        db.refresh(lead)

        return {
            "lead_id": lead.id,
            "customer_id": customer.id,
            "customer_reused": customer_reused,
            "conversation_id": conversation.id,
            "conversation_reused": conversation_reused,
            "status": "received",
        }
