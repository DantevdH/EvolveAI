import os
from typing import Any, Dict, List, Optional, Type
import openai
from google import genai  # type: ignore
from google.genai import types  # type: ignore
import enum

class LLMClient:
    """
    Unified LLM client that routes to OpenAI GPT or Google Gemini based on env.

    Env vars used:
      - LLM_API_KEY
      - LLM_MODEL (for non-chat/one-shot usage)
      - LLM_MODEL_CHAT (for chat-style prompts)
      - TEMPERATURE
    """

    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-4o")
        self.chat_model = os.getenv("LLM_MODEL_CHAT", self.model)
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))

        # Determine provider by model name
        model_lower = (self.chat_model or self.model).lower()
        if model_lower.startswith("gemini"):
            self.provider = "gemini"
        else:
            self.provider = "openai"

        # Initialize provider SDKs
        self._openai_client = None
        self._gemini_model_cache: Dict[str, Any] = {}
        self._gemini_client: Optional[Any] = None

        if self.provider == "openai":
            self._openai_client = openai.OpenAI(api_key=self.api_key)
        else:
            # Client-based auth; no global configure in new SDK
            if not self.api_key:
                raise ValueError(
                    "Missing API key for Google AI. Set LLM_API_KEY (preferred) or GEMINI_API_KEY/GOOGLE_API_KEY."
                )
            self._gemini_client = genai.Client(api_key=self.api_key)

    def _get_gemini_model(self, schema: Optional[Type[Any]] = None) -> Any:
        key = f"{self.chat_model}:{schema.__name__ if schema else 'text'}"
        if key in self._gemini_model_cache:
            return self._gemini_model_cache[key]

        generation_config: Dict[str, Any] = {
            "temperature": self.temperature,
        }
        if schema is not None:
            # Prefer Pydantic class directly per Google SDK examples
            mime = (
                "text/x.enum" if isinstance(schema, type) and issubclass(schema, enum.Enum) else "application/json"
            )
            generation_config.update({
                "response_mime_type": mime,
                "response_schema": schema,
            })

        model = genai.GenerativeModel(self.chat_model, generation_config=generation_config)
        self._gemini_model_cache[key] = model
        return model

    def chat_text(self, messages: List[Dict[str, str]]) -> str:
        """Generate plain text completion for a chat-style prompt."""
        if self.provider == "openai":
            response = self._openai_client.chat.completions.create(
                model=self.chat_model,
                messages=messages,
                temperature=self.temperature,
            )
            return response.choices[0].message.content or ""

        # Gemini Client API - join messages into single prompt
        prompt = "\n".join([m.get("content", "") for m in messages])
        resp = self._gemini_client.models.generate_content(
            model=self.chat_model,
            contents=prompt,
            # No structured schema; free text
        )
        return getattr(resp, "text", "") or ""

    class _Usage:
        def __init__(self, prompt_tokens: Optional[int], completion_tokens: Optional[int], total_tokens: Optional[int]):
            self.prompt_tokens = prompt_tokens
            self.completion_tokens = completion_tokens
            self.total_tokens = total_tokens

    class _CompletionLike:
        def __init__(self, model: str, prompt_tokens: Optional[int], completion_tokens: Optional[int], total_tokens: Optional[int]):
            self.model = model
            self.usage = LLMClient._Usage(prompt_tokens, completion_tokens, total_tokens)

    def chat_parse(self, prompt: str, schema: Type[Any]) -> Any:
        """
        Generate structured output parsed into the provided Pydantic schema.
        - For OpenAI: uses responses API with schema parsing.
        - For Gemini: uses response_schema for auto-parsing.
        Returns the parsed Pydantic instance (or compatible object).
        """
        if self.provider == "openai":
            completion = self._openai_client.chat.completions.parse(
                model=self.chat_model,
                messages=[{"role": "user", "content": prompt}],
                response_format=schema,
                temperature=self.temperature,
            )
            return completion.choices[0].message.parsed, completion

        # Gemini Client API with application/json only
        resp = self._gemini_client.models.generate_content(
            model=self.chat_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
        # google.generativeai returns parsed when response_schema is set
        prompt_tokens = None
        completion_tokens = None
        total_tokens = None
        usage_md = getattr(resp, "usage_metadata", None)
        if usage_md is not None:
            prompt_tokens = getattr(usage_md, "prompt_token_count", None)
            completion_tokens = getattr(usage_md, "candidates_token_count", None)
            total_tokens = getattr(usage_md, "total_token_count", None)
        completion_like = LLMClient._CompletionLike(self.chat_model, prompt_tokens, completion_tokens, total_tokens)
        if hasattr(resp, "parsed") and resp.parsed is not None:
            try:
                # When using JSON schema dict, parsed may be a dict → validate to Pydantic
                return schema.model_validate(resp.parsed), completion_like
            except Exception:
                return resp.parsed, completion_like
        # Fallback: try to parse text via Pydantic
        text = getattr(resp, "text", None)
        if text:
            try:
                return schema.model_validate_json(text), completion_like  # pydantic v2
            except Exception:
                return schema.model_validate_json("{}"), completion_like
        return schema.model_validate({}), completion_like

    def parse_structured(self, prompt: str, openai_schema: Type[Any], gemini_schema: Optional[Type[Any]] = None):
        """
        Unified structured parsing:
        - OpenAI: parse with openai_schema
        - Gemini: if gemini_schema is provided, parse with it; otherwise fall back to openai_schema
        Returns (parsed_obj, completion_like_or_completion)
        """
        if self.provider == "openai" or gemini_schema is None:
            return self.chat_parse(prompt, openai_schema)
        return self.chat_parse(prompt, gemini_schema)


