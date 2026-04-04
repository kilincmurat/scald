"""
SCALD Decision Support Agent
Multilingual AI agent for local government decision making.
Supports: tr, en, el, ro, mk
"""
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from src.utils.locale import get_system_prompt_for_locale

SUPPORTED_LOCALES = {"tr", "en", "el", "ro", "mk"}


class DecisionSupportAgent:
    def __init__(self, model: str = "claude-sonnet-4-6") -> None:
        self.llm = ChatAnthropic(model=model, max_tokens=4096)

    async def analyze(
        self,
        query: str,
        context: dict,
        locale: str = "tr",
    ) -> str:
        if locale not in SUPPORTED_LOCALES:
            locale = "en"

        system_prompt = get_system_prompt_for_locale(locale)

        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_prompt),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{query}"),
        ])

        chain = prompt | self.llm

        response = await chain.ainvoke({
            "query": query,
            "context": str(context),
            "history": [],
        })

        return str(response.content)
