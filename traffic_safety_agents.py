"""
Root-level wrapper and re-export for traffic_safety_agents.
Allows `from traffic_safety_agents import TrafficSafetyCoordinator, TrafficSafetyLLMAssistant` 
regardless of whether it is imported as a module or package.
"""

from traffic_safety_agents.traffic_safety_agents import (
    TrafficSafetyCoordinator,
    ValidationAgent,
    RuleAgent,
    ContextAgent,
    AlertAgent,
    SIGN_RULES,
    normalize_sign_label
)
from traffic_safety_agents.agent_adapter import ModelOutputAdapter
from traffic_safety_agents.llm_assistant import TrafficSafetyLLMAssistant

__all__ = [
    "TrafficSafetyCoordinator",
    "ValidationAgent",
    "RuleAgent",
    "ContextAgent",
    "AlertAgent",
    "SIGN_RULES",
    "normalize_sign_label",
    "ModelOutputAdapter",
    "TrafficSafetyLLMAssistant"
]
