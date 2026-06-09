from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ConversationTurn(BaseModel):
    role: str
    message: str


class LeadContext(BaseModel):
    model_config = ConfigDict(extra="allow")
    source: Optional[str] = None
    lead_name: Optional[str] = None


class BusinessConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    business_name: str = "N/A"
    industry: str = "N/A"
    tone: str = "Professional English"
    primary_goal: str = ""
    primary_cta: str = ""
    products: List[Any] = []
    faqs: List[Any] = []
    qualification_questions: List[Any] = []
    objection_handling: List[Any] = []
    do_not_say: List[str] = []


class AnalyticsAgentData(BaseModel):
    agent: str = "analytics_ai"
    score: int = Field(ge=0, le=100)
    intent: str
    category: str
    recommended_action: str
    # Rich-mode fields (all optional with safe defaults so old contracts still pass)
    sentiment: str = "neutral"           # positive | neutral | negative | frustrated | excited
    urgency: str = "medium"              # low | medium | high | immediate
    buying_signals: List[str] = []       # e.g. ["asking_price", "ready_to_book"]
    objections_detected: List[str] = []  # e.g. ["price_objection", "timing_concern"]
    estimated_deal_value: str = "—"      # short string like "₹15,000-₹50,000" or "—"
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    tags: List[str] = []                 # quick-scan signals e.g. ["class_10", "noida"]


class SalesAgentData(BaseModel):
    agent: str = "sales_ai"
    response_text: str
    next_action: str
    intent: str
    confidence: float = Field(ge=0.0, le=1.0)


class SupportAgentData(BaseModel):
    agent: str = "support_ai"
    response_text: str
    issue_type: str
    escalation_required: bool = False


class ManagerReportData(BaseModel):
    """Manager AI supervisory output. `summary` is the deterministic stats
    computed in code; `recommendations` come from the LLM on top of those."""
    agent: str = "manager_ai"
    summary: dict = Field(default_factory=dict)
    recommendations: List[str] = []
    quality_flags: List[str] = []


class ScenarioPattern(BaseModel):
    """One detected learning pattern."""
    pattern: str
    evidence: str = ""
    severity: str = "medium"  # low | medium | high


class ScenarioRecommendation(BaseModel):
    """One concrete improvement the agent suggests applying back to the system."""
    target: str  # e.g. "config.faqs", "prompt.sales_system", "config.do_not_say"
    change: str
    rationale: str = ""


class ScenarioAgentData(BaseModel):
    """Scenario Engine output — learning/improvement layer over past activity.

    Where Manager AI gives ops-level recs ("investigate the funnel leak"),
    Scenario Engine gives concrete artifact-level changes ("add this FAQ",
    "tighten this prompt rule") plus prose patterns it spotted.
    """
    agent: str = "scenario_engine"
    patterns_detected: List[ScenarioPattern] = []
    recommendations: List[ScenarioRecommendation] = []
    new_faq_candidates: List[dict] = []  # each: {question, suggested_answer}


class AgentInput(BaseModel):
    tenant_id: str
    customer_message: str
    business_config: BusinessConfig
    lead_context: LeadContext = Field(default_factory=LeadContext)
    conversation_history: List[ConversationTurn] = []
    analytics_signal: Optional[AnalyticsAgentData] = None


class AgentEnvelope(BaseModel):
    agent: str
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    error_details: Optional[str] = None
    raw_response: Optional[str] = None
