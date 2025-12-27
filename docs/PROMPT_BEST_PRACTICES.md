# Prompt Engineering Best Practices

Comprehensive guide for creating effective AI prompts based on industry best practices and patterns used in this codebase.

## State-of-the-Art Prompt Structure

The optimal prompt follows six essential components:

### 1. **Persona (Who)**
Define the AI's role with specific expertise, experience level, and domain knowledge.

**Best Practices:**
- ✅ Be specific, not generic: "Senior analyst with 15 years" > "expert"
- ✅ Include domain specialization and relevant experience
- ✅ Define the AI's identity and purpose clearly

**Examples:**
- ❌ **Weak**: "You are an expert..."
- ✅ **Strong**: "You are a senior product data analyst specializing in medical device documentation with 15 years of experience in ESG compliance reporting."

### 2. **Context (Why & Where)**
Explain the business purpose, stakeholders, and use case to ground the model and prevent hallucinations.

**Best Practices:**
- ✅ Ground the model: Always explain WHY (prevents hallucinations)
- ✅ Provide sufficient context about the domain and use case
- ✅ Explicitly state what is IN scope and what is OUT of scope
- ✅ Include business purpose, stakeholders, and importance
- ✅ Specify validation rules clearly

**Examples:**
- ❌ **Weak**: "Extract product information."
- ✅ **Strong**: "We are conducting product data enrichment for CSRD compliance. This data will be used for sustainability assessments and regulatory audits. Accuracy and traceability are critical."

**Format:**
```markdown
**CONTEXT:**
• [Relevant background information]
• [System constraints or limitations]
• [What this prompt is part of]
• ✅ Scope: [What is included]
• ❌ NOT included: [What is excluded]
```

### 3. **Task (What)**
Use direct, active commands. Avoid polite language or ambiguity.

**Best Practices:**
- ✅ Use direct commands: "Extract" not "Can you help extract"
- ✅ Be specific about what you want (not "generate questions" but "generate 7-10 structured questions covering equipment, schedule, and goals")
- ✅ Clearly state what needs to be accomplished with success criteria
- ✅ Break complex tasks into numbered steps when needed
- ✅ Make each step actionable and specific
- ✅ Order steps logically (prerequisites first)

**Examples:**
- ❌ **Weak**: "Can you help extract...?"
- ✅ **Strong**: "Extract comprehensive product information from the provided sources and return a structured ProductCharacteristics object."

**Step-by-Step Process Format:**
```markdown
**STEP-BY-STEP PROCESS:**

Step 1: [Action]
- [Sub-action]
- [Sub-action]

Step 2: [Action]
- [Sub-action]
```

### 4. **Constraints (Guardrails)**
Explicitly state what NOT to do and set boundaries.

**Best Practices:**
- ✅ Organize constraints: Group by category for clarity
- ✅ List constraints early (schema requirements, length limits, format rules)
- ✅ Use "DO NOT" statements for critical restrictions
- ✅ Include edge cases and special handling requirements
- ✅ Anticipate common mistakes and explicitly prevent them
- ✅ Specify what to do in ambiguous cases
- ✅ Provide fallback instructions

**Examples:**
- "Do NOT calculate or estimate percentages"
- "Extract ONLY if explicitly stated"
- "If percentage sum exceeds 100%, note this in reasoning"

**Format:**
```markdown
**CONSTRAINTS:**
1. **Schema Compliance**
   - [Specific rule]
   - [Another rule]
   
2. **Content Requirements**
   - [Content rule]
   - [Quality standard]
```

### 5. **Examples (Few-Shot Prompting)**
Provide 2-3 complete input→output demonstrations showing the exact pattern.

**Best Practices:**
- ✅ Show, don't just tell: Few-shot examples > descriptions
- ✅ Include 2-3 concrete examples showing input → output
- ✅ Cover different scenarios (simple, complex, edge cases)
- ✅ Show full examples: Source text → Complete structured output
- ✅ Include edge cases: conflicting sources, incomplete data, ambiguous information
- ✅ Show both correct and incorrect examples when helpful
- ✅ Use realistic, domain-specific examples
- ✅ Explain why examples are correct

**Format:**
```markdown
**EXAMPLES:**

Example 1: [Scenario]
Input: [Input data]
Output: [Expected output]
Note: [Why this is correct]
```

### 6. **Format (How)**
Specify exact output structure. Reference schemas rather than re-explaining fields.

**Best Practices:**
- ✅ Trust your schemas: Don't duplicate field documentation
- ✅ Define exact schema/structure required (JSON, list format, etc.)
- ✅ Specify data types (string, number, array, boolean)
- ✅ Include field names exactly as expected
- ✅ Show example output structure
- ✅ Clarify required vs. optional fields

**Examples:**
- ❌ **Weak**: Re-describing all schema fields
- ✅ **Strong**: "Return a valid ProductCharacteristics object following the Pydantic schema. Refer to schema definitions for field-level specifications."

**Format:**
```markdown
**OUTPUT FORMAT:**
Return [structure] with:
- field_name: [description and type]
- field_name: [description and type]

**EXAMPLE OUTPUT:**
{
  "field_name": "example_value",
  "field_name": 123
}
```

## Additional Best Practices

### 7. **Clarity & Specificity**
- ✅ Use clear, direct language—avoid ambiguity
- ✅ Define technical terms and acronyms
- ✅ Use concrete examples over abstract descriptions

### 8. **Structure & Organization**
- ✅ Use markdown headers (`**BOLD**`, `##`, `-`) for visual hierarchy
- ✅ Group related information together
- ✅ Use numbered lists for sequential steps
- ✅ Use bullet points for options, constraints, or features
- ✅ Separate sections with clear headers

### 9. **Personalization**
- ✅ Include user-specific information (age, experience, goals)
- ✅ Adapt language complexity to user level
- ✅ Reference user context throughout the prompt
- ✅ Make questions/recommendations relevant to the user

### 10. **Language & Tone**
- ✅ Match the tone to the use case (professional, friendly, technical)
- ✅ Use consistent terminology throughout
- ✅ Avoid jargon unless necessary (and define it)
- ✅ Write in active voice when possible

### 11. **Testing & Iteration**
- ✅ Test prompts with edge cases
- ✅ Verify output matches schema requirements
- ✅ Check that examples are actually achievable
- ✅ Iterate based on actual AI outputs
- ✅ Document prompt versions for comparison

## Recommended Prompt Structure

```markdown
## PERSONA
[Specific role with domain expertise and experience level]

## CONTEXT
[Business purpose, stakeholders, use case, importance]
• ✅ Scope: [What is included]
• ❌ NOT included: [What is excluded]

## TASK
[Direct command: Extract X and return Y]

## INPUT DATA
[What data is provided to the AI]

## CONSTRAINTS
[Organized by category: Material Extraction, Nutritional Info, Weight/Volume, etc.]

## STEP-BY-STEP PROCESS
[For complex tasks, break down into numbered steps]

## EXAMPLES
[2-3 complete input→output demonstrations]

## FORMAT
[Reference schema, don't re-explain fields]

## VALIDATION CHECKLIST
[Items to verify before finalizing]
```

## Common Patterns

### Role Definition
```markdown
**WHO YOU ARE:**
You are an AI assistant that [specific role and purpose].

**YOUR TASK:**
[Clear, specific task description with success criteria].
```

### Context Section
```markdown
**CONTEXT:**
• [Relevant background information]
• [System constraints or limitations]
• [What this prompt is part of]
• ✅ Scope: [What is included]
• ❌ NOT included: [What is excluded]
```

### Constraints Format
```markdown
**CONSTRAINTS:**
1. **Schema Compliance**
   - [Specific rule]
   - [Another rule]
   
2. **Content Requirements**
   - [Content rule]
   - [Quality standard]
```

### Output Format
```markdown
**OUTPUT FORMAT:**
Return [structure] with:
- field_name: [description and type]
- field_name: [description and type]

**EXAMPLE OUTPUT:**
{
  "field_name": "example_value",
  "field_name": 123
}
```

### Validation Checklist
```markdown
**VALIDATION CHECKLIST:**
Before finalizing, ensure:
✓ [Requirement 1]
✓ [Requirement 2]
✓ [Requirement 3]
```

## Anti-Patterns to Avoid

### ❌ Vague Instructions
- Bad: "Generate questions"
- Good: "Generate 7-10 structured questions covering equipment access, training schedule, and strength goals"

### ❌ Missing Context
- Bad: "Format this data"
- Good: "Format this question content into AIQuestion schema for mobile app display, ensuring all required fields are present"

### ❌ Unclear Output Format
- Bad: "Return a list"
- Good: "Return AIQuestionResponse schema with: questions (List[AIQuestion]), total_questions (int), estimated_time_minutes (int)"

### ❌ No Examples
- Bad: Prompt without examples
- Good: Include 2-3 concrete examples showing input → expected output

### ❌ Buried Constraints
- Bad: Constraints mentioned at the end
- Good: Critical constraints stated early and repeated in validation checklist

### ❌ Ambiguous Language
- Bad: "Make it good" or "Use appropriate values"
- Good: "Use 1-5 rating scale" or "Include 2-4 options per multiple choice question"

### ❌ Generic Persona
- Bad: "You are an expert..."
- Good: "You are a senior product data analyst specializing in medical device documentation with 15 years of experience in ESG compliance reporting."

### ❌ Polite but Vague Commands
- Bad: "Can you help extract...?"
- Good: "Extract comprehensive product information from the provided sources and return a structured ProductCharacteristics object."

## Complete Prompt Template

```markdown
## PERSONA
[Specific role with domain expertise and experience level]

## CONTEXT
[Background information]
• [Business purpose, stakeholders, use case, importance]
• ✅ Scope: [What's included]
• ❌ NOT included: [What's excluded]

## TASK
[Specific task with success criteria - use direct commands]

## INPUT DATA
[What data is provided to the AI]

## CONSTRAINTS & REQUIREMENTS

1. **Category 1**
   - Rule 1
   - Rule 2

2. **Category 2**
   - Rule 1
   - Rule 2

## STEP-BY-STEP PROCESS

Step 1: [Action]
- [Sub-action]

Step 2: [Action]
- [Sub-action]

## EXAMPLES

Example 1: [Scenario]
Input: [Input data]
Output: [Expected output]
Note: [Why this is correct]

Example 2: [Edge case scenario]
Input: [Input data]
Output: [Expected output]
Note: [How this handles the edge case]

## FORMAT
- Format: [Structure]
- Fields: [List with types]
- Validation: [Rules]
- Reference: [Schema name if applicable]

## VALIDATION CHECKLIST
✓ [Requirement]
✓ [Requirement]
✓ [Requirement]
```

## Key Principles Summary

1. **Be specific, not generic**: "Senior analyst with 15 years" > "expert"
2. **Ground the model**: Always explain WHY (prevents hallucinations)
3. **Use direct commands**: "Extract" not "Can you help extract"
4. **Show, don't just tell**: Few-shot examples > descriptions
5. **Trust your schemas**: Don't duplicate field documentation
6. **Organize constraints**: Group by category for clarity
7. **Test and iterate**: Verify with edge cases and refine based on outputs

## Quality Checklist

Before finalizing a prompt, verify:

- [ ] Persona is specific with domain expertise and experience level
- [ ] Context provides sufficient background and explains WHY
- [ ] Task uses direct, active commands with clear success criteria
- [ ] All constraints are explicitly stated and organized by category
- [ ] At least 2-3 examples are included covering different scenarios
- [ ] Output format is precisely specified (reference schemas when possible)
- [ ] Step-by-step process is clear and actionable (if needed)
- [ ] Validation checklist covers critical requirements
- [ ] Language is clear and unambiguous
- [ ] Personalization is included where relevant
- [ ] Edge cases are addressed
- [ ] Prompt has been tested with actual AI

## References

- See `backend/core/training/helpers/prompt_generator.py` for implementation examples
- See `backend/core/base/reflector.py` for lesson extraction prompt patterns
- Industry resources: OpenAI Prompt Engineering Guide, Anthropic Prompt Library

---

**Note**: Prompts should be iterative—test, refine, and improve based on actual AI outputs. Document changes and version prompts for comparison.
