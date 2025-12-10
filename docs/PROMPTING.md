# Prompt Engineering Best Practices

## State-of-the-Art Prompt Structure

The optimal prompt follows six essential components:

### 1. **Persona (Who)**
Define the AI's role with specific expertise, experience level, and domain knowledge.
- **Weak**: "You are an expert..."
- **Strong**: "You are a senior product data analyst specializing in medical device documentation with 15 years of experience in ESG compliance reporting."

### 2. **Context (Why & Where)**
Explain the business purpose, stakeholders, and use case to ground the model and prevent hallucinations.
- **Weak**: "Extract product information."
- **Strong**: "We are conducting product data enrichment for CSRD compliance. This data will be used for sustainability assessments and regulatory audits. Accuracy and traceability are critical."

### 3. **Task (What)**
Use direct, active commands. Avoid polite language or ambiguity.
- **Weak**: "Can you help extract...?"
- **Strong**: "Extract comprehensive product information from the provided sources and return a structured ProductCharacteristics object."

### 4. **Constraints (Guardrails)**
Explicitly state what NOT to do and set boundaries.
- Examples: "Do NOT calculate or estimate percentages", "Extract ONLY if explicitly stated", "If percentage sum exceeds 100%, note this in reasoning"

### 5. **Examples (Few-Shot Prompting)**
Provide 2-3 complete input→output demonstrations showing the exact pattern.
- Show full examples: Source text → Complete structured output
- Include edge cases: conflicting sources, incomplete data, ambiguous information

### 6. **Format (How)**
Specify exact output structure. Reference schemas rather than re-explaining fields.
- **Weak**: Re-describing all schema fields
- **Strong**: "Return a valid ProductCharacteristics object following the Pydantic schema. Refer to schema definitions for field-level specifications."

---

## Recommended Prompt Structure

```
## PERSONA
[Specific role with domain expertise and experience level]

## CONTEXT
[Business purpose, stakeholders, use case, importance]

## TASK
[Direct command: Extract X and return Y]

## CONSTRAINTS
[Organized by category: Material Extraction, Nutritional Info, Weight/Volume, etc.]

## EXAMPLES
[2-3 complete input→output demonstrations]

## FORMAT
[Reference schema, don't re-explain fields]

## PRODUCT INFORMATION
[Actual product data to extract from]
```

---

## Key Principles

1. **Be specific, not generic**: "Senior analyst with 15 years" > "expert"
2. **Ground the model**: Always explain WHY (prevents hallucinations)
3. **Use direct commands**: "Extract" not "Can you help extract"
4. **Show, don't just tell**: Few-shot examples > descriptions
5. **Trust your schemas**: Don't duplicate field documentation
6. **Organize constraints**: Group by category for clarity

