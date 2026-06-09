"""
Deterministic offline LLM provider for development and demo use.

Selected via `LLM_PROVIDER=mock`. Returns contextually-sensible canned JSON
based on the LATEST customer message (extracted from the prompt's wrapped
<USER_INPUT type="customer_message"> block) so conversation history doesn't
poison keyword matches. Handles common follow-ups (yes / ok / haan / nahi)
to keep the demo conversation feeling natural without a real LLM.
"""
import re
from typing import Any, Dict, Optional

_CUSTOMER_MSG_RE = re.compile(
    r'<USER_INPUT type="customer_message">\s*(.*?)\s*</USER_INPUT>',
    re.DOTALL,
)


def _extract_latest_customer_message(user_prompt: str) -> str:
    """The prompt embeds conversation_history AND the latest customer_message.
    Match only the latest one so old messages don't keep triggering the same
    keyword branch on every turn.
    """
    matches = _CUSTOMER_MSG_RE.findall(user_prompt or "")
    if matches:
        return matches[-1].strip().lower()
    return (user_prompt or "").lower()


def _history_contains(user_prompt: str, *needles: str) -> bool:
    """Whether the prompt's earlier turns (history block) mention a topic.
    Used to give 'yes / ok' follow-ups a memory of what the customer was
    asking about.
    """
    text = (user_prompt or "").lower()
    return any(n in text for n in needles)


_AFFIRMATIVE = {"yes", "yep", "ya", "yeah", "haan", "han", "ji", "ji haan", "ok", "okay", "okey",
                "sure", "theek hai", "thik hai", "chalega", "fine"}
_NEGATIVE = {"no", "nope", "nah", "nahi", "nahin", "naa", "nai"}


class MockLLMProvider:
    def generate_json(
        self,
        system_instruction: str,
        user_prompt: str,
        expected_schema: str,
        temperature: float = 0.2,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        latest = _extract_latest_customer_message(user_prompt)
        if '"sales_ai"' in expected_schema:
            return self._sales(latest, user_prompt)
        if '"support_ai"' in expected_schema:
            return self._support(latest, user_prompt)
        if '"analytics_ai"' in expected_schema:
            return self._analytics(latest, user_prompt)
        if '"manager_ai"' in expected_schema:
            return self._manager(user_prompt)
        if '"scenario_engine"' in expected_schema:
            return self._scenario(user_prompt)
        return {"agent": "mock_ai"}

    # ----- analytics_ai -----
    @staticmethod
    def _extract_tags(text: str) -> list:
        tags = []
        # generic scan-keywords
        for kw, tag in [
            ("class 10", "class_10"), ("class 11", "class_11"), ("class 12", "class_12"),
            ("jee", "jee"), ("neet", "neet"), ("pcm", "pcm"),
            ("noida", "noida"), ("delhi", "delhi"), ("pune", "pune"), ("mumbai", "mumbai"),
            ("bengaluru", "bengaluru"), ("chennai", "chennai"), ("gurgaon", "gurgaon"),
            ("budget", "budget_mentioned"), ("monthly", "monthly_pay"),
            ("free", "free_seeker"),
            ("3bhk", "3bhk"), ("2bhk", "2bhk"), ("4bhk", "4bhk"),
            ("dlf", "dlf"), ("test drive", "test_drive"), ("emi", "emi_inquiry"),
            ("creta", "creta"), ("hyryder", "hyryder"),
        ]:
            if kw in text and tag not in tags:
                tags.append(tag)
        return tags[:5]

    @staticmethod
    def _analytics(latest: str, full_prompt: str) -> Dict[str, Any]:
        tags = MockLLMProvider._extract_tags(latest)
        if any(w in latest for w in ("buy followers", "spam", "free crypto", "earn $$$", "guaranteed 50%")):
            return {"agent": "analytics_ai", "score": 2, "intent": "spam",
                    "category": "spam", "recommended_action": "ignore",
                    "sentiment": "neutral", "urgency": "low",
                    "buying_signals": [], "objections_detected": [],
                    "estimated_deal_value": "—", "confidence": 0.95,
                    "tags": ["bot_pattern", "spam_signals"]}
        if any(w in latest for w in ("refund", "complaint", "not working", "nahi chal",
                                     "broken", "return", "khrab", "login", "password",
                                     "billing", "charge", "double cut", "galat charge",
                                     "legal", "material download", "pdf kahan", "error aa")):
            frustrated = any(w in latest for w in ("legal", "double", "galat", "complaint"))
            return {"agent": "analytics_ai", "score": 45, "intent": "support_request",
                    "category": "warm_lead", "recommended_action": "support_routing",
                    "sentiment": "frustrated" if frustrated else "negative",
                    "urgency": "high" if frustrated else "medium",
                    "buying_signals": [],
                    "objections_detected": ["technical_issue"] if "login" in latest or "not working" in latest or "nahi chal" in latest else (["billing_dispute"] if frustrated else ["support_gap"]),
                    "estimated_deal_value": "existing_customer",
                    "confidence": 0.82,
                    "tags": tags + (["existing_customer"] if "existing_customer" not in tags else [])}
        if any(w in latest for w in ("price", "cost", "pricing", "kitna", "kya hai", "fees")):
            return {"agent": "analytics_ai", "score": 85, "intent": "pricing_query",
                    "category": "hot_lead", "recommended_action": "sales_followup",
                    "sentiment": "positive", "urgency": "high",
                    "buying_signals": ["asking_price", "active_inquiry"],
                    "objections_detected": [],
                    "estimated_deal_value": "₹15,000-₹50,000",
                    "confidence": 0.9,
                    "tags": tags + ["pricing_inquiry"]}
        if any(w in latest for w in ("demo", "trial", "book a call", "schedule", "book karni", "test drive", "site visit")):
            return {"agent": "analytics_ai", "score": 80, "intent": "demo_request",
                    "category": "hot_lead", "recommended_action": "sales_followup",
                    "sentiment": "excited", "urgency": "high",
                    "buying_signals": ["ready_to_book", "wants_demo"],
                    "objections_detected": [],
                    "estimated_deal_value": "₹20,000-₹75,000",
                    "confidence": 0.88,
                    "tags": tags + ["demo_intent"]}
        # Short affirmative / acknowledgement → use the topic from history if we can find one
        if latest in _AFFIRMATIVE or len(latest) <= 4:
            if _history_contains(full_prompt, "demo"):
                return {"agent": "analytics_ai", "score": 88, "intent": "demo_confirmation",
                        "category": "hot_lead", "recommended_action": "sales_followup",
                        "sentiment": "excited", "urgency": "immediate",
                        "buying_signals": ["confirmed_demo", "ready_to_proceed"],
                        "objections_detected": [],
                        "estimated_deal_value": "₹25,000-₹80,000",
                        "confidence": 0.9, "tags": tags + ["confirmed"]}
            if _history_contains(full_prompt, "price", "cost", "pricing"):
                return {"agent": "analytics_ai", "score": 82, "intent": "pricing_confirmation",
                        "category": "hot_lead", "recommended_action": "sales_followup",
                        "sentiment": "positive", "urgency": "high",
                        "buying_signals": ["accepted_pricing", "ready_to_proceed"],
                        "objections_detected": [],
                        "estimated_deal_value": "₹20,000-₹60,000",
                        "confidence": 0.85, "tags": tags + ["budget_aligned"]}
            return {"agent": "analytics_ai", "score": 70, "intent": "engagement",
                    "category": "warm_lead", "recommended_action": "qualification",
                    "sentiment": "neutral", "urgency": "medium",
                    "buying_signals": ["engaged"], "objections_detected": [],
                    "estimated_deal_value": "—", "confidence": 0.6, "tags": tags}
        if latest in _NEGATIVE:
            return {"agent": "analytics_ai", "score": 35, "intent": "disengagement",
                    "category": "cold_lead", "recommended_action": "nurture",
                    "sentiment": "negative", "urgency": "low",
                    "buying_signals": [], "objections_detected": ["not_interested"],
                    "estimated_deal_value": "—", "confidence": 0.78,
                    "tags": tags + ["disengaged"]}
        return {"agent": "analytics_ai", "score": 55, "intent": "general_query",
                "category": "warm_lead", "recommended_action": "qualification",
                "sentiment": "neutral", "urgency": "medium",
                "buying_signals": ["initial_interest"], "objections_detected": [],
                "estimated_deal_value": "—", "confidence": 0.65,
                "tags": tags + ["needs_qualification"]}

    # ----- sales_ai -----
    @staticmethod
    def _sales(latest: str, full_prompt: str) -> Dict[str, Any]:
        # Affirmation after a topic was raised: progress the conversation forward.
        if latest in _AFFIRMATIVE or len(latest) <= 4:
            if _history_contains(full_prompt, "demo"):
                return {"agent": "sales_ai",
                        "response_text": "Bahut badhiya! Demo confirm karta hoon. Kal subah 11 baje suit karega ya shaam 6 baje? Aapka phone number share karein taaki main reminder bhej dun.",
                        "next_action": "collect_phone", "intent": "demo_confirmation", "confidence": 0.93}
            if _history_contains(full_prompt, "price", "cost", "pricing"):
                return {"agent": "sales_ai",
                        "response_text": "Bilkul! Pricing plans share karta hoon — ₹1,500/month basic ya ₹3,500/month premium. Aapka class level aur kitne students hain? Best plan suggest karta hoon.",
                        "next_action": "qualify_class_level", "intent": "pricing_qualification", "confidence": 0.9}
            if _history_contains(full_prompt, "refund", "support"):
                return {"agent": "sales_ai",
                        "response_text": "Theek hai. Aapka order number share kar dein, main refund team se confirm karke aapko update deta hoon — usually 7 din mein ho jata hai.",
                        "next_action": "collect_order_id", "intent": "support_request", "confidence": 0.82}
            return {"agent": "sales_ai",
                    "response_text": "Got it! Aap bataiye kya specific information chahiye — main aapko detailed help kar paunga.",
                    "next_action": "open_question", "intent": "engagement", "confidence": 0.78}
        if latest in _NEGATIVE:
            return {"agent": "sales_ai",
                    "response_text": "Koi baat nahi! Agar bad mein interest ho toh kabhi bhi message karna. Aapka time dene ka shukriya.",
                    "next_action": "graceful_close", "intent": "disengagement", "confidence": 0.7}
        if any(w in latest for w in ("price", "cost", "pricing", "kitna", "fees")):
            return {"agent": "sales_ai",
                    "response_text": "Plans start at ₹1,500. Want to see what fits your needs? Aap kis class level ke liye dekh rahe hain?",
                    "next_action": "qualify_class_level", "intent": "pricing_query", "confidence": 0.9}
        if "demo" in latest or "trial" in latest:
            return {"agent": "sales_ai",
                    "response_text": "Awesome — chaliye ek 15-min demo set karte hain. Mornings ya evenings — kya prefer karenge?",
                    "next_action": "schedule_demo", "intent": "demo_request", "confidence": 0.92}
        if "refund" in latest or "complaint" in latest:
            return {"agent": "sales_ai",
                    "response_text": "Sorry for the trouble! Aapka order details share karenge taaki team turant help kar paaye?",
                    "next_action": "collect_info", "intent": "support_request", "confidence": 0.75}
        return {"agent": "sales_ai",
                "response_text": "Happy to help — aap thoda detail bata sakte hain kya specifically dekh rahe hain?",
                "next_action": "open_question", "intent": "general_query", "confidence": 0.7}

    # ----- support_ai -----
    @staticmethod
    def _support(latest: str, full_prompt: str) -> Dict[str, Any]:
        if "refund" in latest or "paisa wapas" in latest:
            return {"agent": "support_ai",
                    "response_text": "Apke refund ke liye, hamari policy ke according 7 din ke andar full refund mil sakta hai. Aap apna order ID share karein, main process turant start karta hoon.",
                    "issue_type": "refund", "escalation_required": False}
        if any(w in latest for w in ("not working", "nahi chal", "broken", "khrab", "issue", "problem")):
            return {"agent": "support_ai",
                    "response_text": "Bahut sorry for the trouble! Aap exactly kya issue face kar rahe hain — login problem, video not playing, ya kuch aur? Step-by-step solve karte hain.",
                    "issue_type": "technical_issue", "escalation_required": False}
        if "billing" in latest or "payment" in latest or "charge" in latest:
            return {"agent": "support_ai",
                    "response_text": "Billing query ke liye aapka registered email share karein, main aapka payment status check karta hoon abhi.",
                    "issue_type": "billing", "escalation_required": False}
        return {"agent": "support_ai",
                "response_text": "Main aapki help karne ke liye hoon. Thoda detail bataiye kya issue hai?",
                "issue_type": "general_query", "escalation_required": False}

    # ----- manager_ai -----
    @staticmethod
    def _manager(full_prompt: str) -> Dict[str, Any]:
        """The prompt contains a JSON summary block; mock reads it lightly to
        produce recommendations that always feel grounded."""
        text = full_prompt or ""
        recs = []
        flags = []
        # Quick scan of the embedded summary text
        if '"hot_leads":' in text:
            try:
                hot = int(text.split('"hot_leads":')[1].split(",")[0].strip())
                total = int(text.split('"total_leads":')[1].split(",")[0].strip())
                if total and hot / max(total, 1) < 0.3:
                    recs.append(f"Only {hot} of {total} leads converted to hot_lead — review qualification prompts and lead source quality.")
                if hot >= 2:
                    recs.append(f"{hot} hot leads detected — make sure CTA follow-up is fast (under 5 min) to maximize conversion.")
            except Exception:
                pass
        if '"support_routing":' in text:
            recs.append("Support routing is active — ensure Support AI has updated FAQ + escalation rules so it can resolve issues without human handoff.")
        if '"spam":' in text and '"spam": 0' not in text:
            recs.append("Spam-flagged leads present — consider tightening lead source filters or honeypot fields on the intake form.")
            flags.append("spam_present")
        if '"policy_violations_detected"' in text and '"policy_violations_detected": 0' not in text:
            recs.append("Sales AI drafted restricted phrases — strengthen do_not_say guidance in business config.")
            flags.append("policy_violations")
        if '"abandoned_conversations":' in text and '"abandoned_conversations": 0' not in text:
            flags.append("abandoned_conversations")
        if not recs:
            recs = [
                "Pipeline is healthy — keep monitoring conversion rate by agent invocations.",
                "Consider running scenario analysis weekly to surface emerging objection patterns.",
            ]
        return {
            "agent": "manager_ai",
            "summary": {},
            "recommendations": recs[:5],
            "quality_flags": flags,
        }

    # ----- scenario_engine -----
    @staticmethod
    def _scenario(full_prompt: str) -> Dict[str, Any]:
        """Tiny mock for the scenario engine — surfaces 1-2 reasonable artifact
        suggestions based on coarse signals in the prompt."""
        text = (full_prompt or "").lower()
        patterns = []
        recs = []
        faqs = []

        if "refund" in text or "not working" in text or "nahi chal" in text:
            patterns.append({
                "pattern": "Refund / not-working query repeated",
                "evidence": "Multiple customer messages contained refund or non-working signals across recent turns.",
                "severity": "medium",
            })
            recs.append({
                "target": "config.faqs",
                "change": '{"q": "Course working nahi ho raha — kya karein?", "a": "Pehle browser cache clear karein, ya support team ko order ID ke saath email karein — usually 24 hours mein resolve ho jata hai."}',
                "rationale": "Recurring 'not working' inquiries — pin this FAQ so Support AI answers instantly.",
            })
            faqs.append({
                "question": "Course working nahi ho raha hai — kya solution hai?",
                "suggested_answer": "Browser cache clear karke fresh login try karein. Issue persist kare to support@demo.coaching pe order ID share karein — team 24 hours mein resolve kar deti hai.",
            })
        if "price" in text or "pricing" in text or "kitna" in text:
            patterns.append({
                "pattern": "Pricing inquiries dominate intake",
                "evidence": "Pricing-related intents repeated across several conversations — qualification path may be too long before sharing price.",
                "severity": "low",
            })
            recs.append({
                "target": "prompt.sales_system",
                "change": "When the customer's FIRST message asks pricing, share the headline price up front, THEN ask one qualifying question (class level) instead of withholding price.",
                "rationale": "Frequent pricing-first queries — fast pricing reveal improves trust without sacrificing qualification.",
            })
        if "demo" in text and ("yes" in text or "haan" in text or "book" in text):
            patterns.append({
                "pattern": "Demo confirmation flow needs concrete time slots",
                "evidence": "After 'demo book karna hai' the user agreed; concrete slot picker would convert faster.",
                "severity": "low",
            })
            recs.append({
                "target": "config.objection_handling",
                "change": '{"objection": "no specific time", "response": "Aapke liye 11 AM, 4 PM, ya 7 PM available hai kal — kaun sa best?"}',
                "rationale": "Reduces friction between 'yes' and confirmed slot.",
            })

        if not patterns:
            patterns.append({
                "pattern": "Insufficient data — chat more to surface patterns",
                "evidence": "Not enough conversation turns to draw confident learning signals yet.",
                "severity": "low",
            })

        return {
            "agent": "scenario_engine",
            "patterns_detected": patterns,
            "recommendations": recs,
            "new_faq_candidates": faqs,
        }
