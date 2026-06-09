from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db import models
from app.schemas.config_schema import BusinessConfigCreate


class ConfigService:
    """Tenant business-config persistence.

    Stores one row per tenant in `business_configs` (JSON column). On a repeat
    POST for the same tenant the row is updated in place, so callers can treat
    /config/create as an upsert. Auto-creates the tenant on first write so the
    foreign-key isn't a footgun in dev.
    """

    @staticmethod
    def create_config(payload: BusinessConfigCreate, db: Session) -> dict:
        # Auto-create tenant on first config write; refresh the human-readable
        # name on every write so a tenant first seen via /leads/create (which
        # only had the tenant_id placeholder) gets the proper business_name
        # as soon as a real config arrives.
        tenant = db.get(models.Tenant, payload.tenant_id)
        if tenant is None:
            db.add(models.Tenant(id=payload.tenant_id, name=payload.business_name))
            db.flush()
        elif payload.business_name and tenant.name != payload.business_name:
            tenant.name = payload.business_name

        config_data = payload.model_dump(exclude={"tenant_id"})

        existing = (
            db.query(models.BusinessConfig)
            .filter(models.BusinessConfig.tenant_id == payload.tenant_id)
            .first()
        )
        if existing is None:
            db.add(
                models.BusinessConfig(
                    tenant_id=payload.tenant_id, config_data=config_data
                )
            )
        else:
            existing.config_data = config_data

        db.commit()
        return {"success": True, "tenant_id": payload.tenant_id}

    @staticmethod
    def get_config(tenant_id: str, db: Session) -> dict:
        row = (
            db.query(models.BusinessConfig)
            .filter(models.BusinessConfig.tenant_id == tenant_id)
            .order_by(models.BusinessConfig.id.desc())
            .first()
        )
        if row is None:
            raise HTTPException(
                status_code=404, detail=f"no_config_for_tenant:{tenant_id}"
            )
        # Response_model is BusinessConfigCreate (= BusinessConfig + tenant_id).
        return {"tenant_id": tenant_id, **(row.config_data or {})}
