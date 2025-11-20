"""
Unified LLM client using Instructor for multi-provider structured output support.

Supports OpenAI, Gemini, Claude, and other providers through Instructor.
Provides complex and lightweight model instances for different use cases.
"""

import os
from typing import Any, Dict, List, Optional, Type
import instructor
from openai import OpenAI
from google import genai  # type: ignore
from anthropic import Anthropic  # type: ignore
from settings import settings

class LLMClient:
    """
    Unified LLM client using Instructor for structured output across all providers.
    
    Uses Settings for configuration:
      - LLM_API_KEY (works for all providers)
      - LLM_MODEL_COMPLEX (e.g., gemini-2.5-flash)
      - LLM_MODEL_LIGHTWEIGHT (e.g., gemini-2.5-flash-lite)
      - TEMPERATURE (applies to both models)
    
    Uses settings (which reads from environment dynamically) for all configuration.
    """

    def __init__(self):

        self.api_key = settings.LLM_API_KEY
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY not found in environment variables")
        
        self.complex_model_name = settings.LLM_MODEL_COMPLEX
        self.lightweight_model_name = settings.LLM_MODEL_LIGHTWEIGHT
        self.temperature = settings.TEMPERATURE
        
        # Initialize only the clients needed based on model names
        self._init_clients_for_models()
        
        # Create model instances
        self.complex_model = self._get_instructor_model(self.complex_model_name)
        self.lightweight_model = self._get_instructor_model(self.lightweight_model_name)

    def _init_clients_for_models(self):
        """Initialize only the clients needed based on the model names in use."""
        # Check which providers are needed based on model names
        models_to_check = [self.complex_model_name, self.lightweight_model_name]
        needs_openai = any("gpt" in m.lower() or "openai" in m.lower() for m in models_to_check)
        needs_gemini = any("gemini" in m.lower() for m in models_to_check)
        needs_anthropic = any("claude" in m.lower() or "anthropic" in m.lower() for m in models_to_check)
        
        # Initialize only needed clients
        self._openai_client = None
        self._gemini_client = None
        self._anthropic_client = None
        
        if needs_openai:
            self._openai_client = OpenAI(api_key=self.api_key)
        
        if needs_gemini:
            try:
                self._gemini_client = genai.Client(api_key=self.api_key)
            except Exception:
                self._gemini_client = None
        
        if needs_anthropic:
            try:
                anthropic_key = os.getenv("ANTHROPIC_API_KEY", self.api_key)
                self._anthropic_client = Anthropic(api_key=anthropic_key)
            except Exception:
                self._anthropic_client = None

    def _get_provider(self, model_name: str) -> str:
        """Detect provider from model name."""
        model_lower = model_name.lower()
        if model_lower.startswith("gemini"):
            return "gemini"
        elif model_lower.startswith("claude"):
            return "anthropic"
        else:
            return "openai"

    def _get_instructor_model(self, model_name: str):
        """Get Instructor-wrapped model for the given model name."""
        provider = self._get_provider(model_name)
        
        if provider == "openai":
            # Use instructor.from_openai for OpenAI
            return instructor.from_openai(self._openai_client, mode=instructor.Mode.JSON)
        elif provider == "gemini":
            if not self._gemini_client:
                raise ValueError("Gemini client not initialized. Check LLM_API_KEY.")
            # Instructor doesn't support Gemini directly, use client with structured output
            return self._gemini_client
        elif provider == "anthropic":
            if not self._anthropic_client:
                raise ValueError("Anthropic client not initialized. Check LLM_API_KEY or model name.")
            # Use instructor.from_anthropic for Anthropic
            return instructor.from_anthropic(self._anthropic_client, mode=instructor.Mode.JSON)
        else:
            raise ValueError(f"Unsupported provider for model: {model_name}")

    def chat_text(self, messages: List[Dict[str, str]], model_type: str = "lightweight") -> str:
        """
        Generate plain text completion for a chat-style prompt.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model_type: "complex" or "lightweight"
        
        Returns:
            Generated text response
        """
        model = self.complex_model if model_type == "complex" else self.lightweight_model
        model_name = self.complex_model_name if model_type == "complex" else self.lightweight_model_name
        provider = self._get_provider(model_name)
        
        if provider == "openai":
            response = self._openai_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=self.temperature,
            )
            return response.choices[0].message.content or ""
        elif provider == "gemini":
            # Join messages into single prompt for Gemini
            prompt = "\n".join([f"{m.get('role', 'user').upper()}: {m.get('content', '')}" for m in messages])
            resp = self._gemini_client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            return getattr(resp, "text", "") or ""
        elif provider == "anthropic":
            # Convert messages format for Anthropic
            if not self._anthropic_client:
                raise ValueError("Anthropic client not initialized. Check LLM_API_KEY or model name.")
            system_msg = None
            user_msgs = []
            for msg in messages:
                if msg.get("role") == "system":
                    system_msg = msg.get("content", "")
                else:
                    user_msgs.append(msg.get("content", ""))
            
            response = self._anthropic_client.messages.create(
                model=model_name,
                max_tokens=4096,
                temperature=self.temperature,
                system=system_msg or "",
                messages=[{"role": "user", "content": "\n".join(user_msgs)}],
            )
            return response.content[0].text if response.content else ""
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    class _Usage:
        """Usage information wrapper."""
        def __init__(self, prompt_tokens: Optional[int], completion_tokens: Optional[int], total_tokens: Optional[int]):
            self.prompt_tokens = prompt_tokens
            self.completion_tokens = completion_tokens
            self.total_tokens = total_tokens

    class _CompletionLike:
        """Completion-like object for compatibility."""
        def __init__(self, model: str, prompt_tokens: Optional[int], completion_tokens: Optional[int], total_tokens: Optional[int]):
            self.model = model
            self.usage = LLMClient._Usage(prompt_tokens, completion_tokens, total_tokens)

    def chat_parse(self, prompt: str, schema: Type[Any], model_type: str = "lightweight"):
        """
        Generate structured output parsed into the provided Pydantic schema.
        
        Args:
            prompt: The prompt text
            schema: Pydantic model class
            model_type: "complex" or "lightweight"
        
        Returns:
            Tuple of (parsed_obj, completion_like)
        """
        model = self.complex_model if model_type == "complex" else self.lightweight_model
        model_name = self.complex_model_name if model_type == "complex" else self.lightweight_model_name
        provider = self._get_provider(model_name)
        
        # Use Instructor's structured output
        if provider == "openai":
            # Instructor patched OpenAI client
            response = model.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                response_model=schema,
                temperature=self.temperature,
            )
            parsed_obj = response.parsed
            usage = response.usage
            completion_like = LLMClient._CompletionLike(
                model_name,
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens
            )
            return parsed_obj, completion_like
            
        elif provider == "gemini":
            # Gemini with structured output
            from google.genai import types
            resp = self._gemini_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
            # Parse response
            if hasattr(resp, "parsed") and resp.parsed is not None:
                parsed_obj = schema.model_validate(resp.parsed)
            else:
                text = getattr(resp, "text", None) or "{}"
                parsed_obj = schema.model_validate_json(text)
            
            # Extract usage
            usage_md = getattr(resp, "usage_metadata", None)
            prompt_tokens = getattr(usage_md, "prompt_token_count", None) if usage_md else None
            completion_tokens = getattr(usage_md, "candidates_token_count", None) if usage_md else None
            total_tokens = getattr(usage_md, "total_token_count", None) if usage_md else None
            
            completion_like = LLMClient._CompletionLike(model_name, prompt_tokens, completion_tokens, total_tokens)
            return parsed_obj, completion_like
            
        elif provider == "anthropic":
            # Instructor patched Anthropic client (lazy initialization already handled in _get_instructor_model)
            response = model.messages.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                response_model=schema,
                temperature=self.temperature,
                max_tokens=4096,
            )
            parsed_obj = response.parsed
            # Anthropic usage
            usage = getattr(response, "usage", None)
            prompt_tokens = getattr(usage, "input_tokens", None) if usage else None
            completion_tokens = getattr(usage, "output_tokens", None) if usage else None
            total_tokens = (prompt_tokens or 0) + (completion_tokens or 0) if prompt_tokens or completion_tokens else None
            
            completion_like = LLMClient._CompletionLike(model_name, prompt_tokens, completion_tokens, total_tokens)
            return parsed_obj, completion_like
            
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def parse_structured(self, prompt: str, schema: Type[Any], model_type: str = "lightweight"):
        """
        Unified structured parsing (alias for chat_parse for backward compatibility).
        
        Args:
            prompt: The prompt text
            schema: Pydantic model class
            model_type: "complex" or "lightweight"
        
        Returns:
            Tuple of (parsed_obj, completion_like)
        """
        return self.chat_parse(prompt, schema, model_type)
