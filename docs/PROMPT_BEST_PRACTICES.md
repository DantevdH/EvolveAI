# Prompt Engineering Best Practices

Concise guide for creating effective AI prompts based on industry best practices and patterns used in this codebase.

## Core Structure

### Essential Sections (In Order)
- **WHO YOU ARE / ROLE**: Define the AI's identity and purpose
- **YOUR TASK / TASK**: Clearly state what needs to be accomplished
- **CONTEXT**: Provide background information and constraints
- **INPUT DATA**: Specify what data is being provided
- **CONSTRAINTS & REQUIREMENTS**: List rules, limitations, and must-follow guidelines
- **STEP-BY-STEP PROCESS**: Break down complex tasks into clear steps
- **OUTPUT REQUIREMENTS**: Define exact format, schema, and structure expected
- **EXAMPLES**: Include few-shot examples showing correct output
- **VALIDATION CHECKLIST**: List items to verify before finalizing

## Best Practices

### 1. **Clarity & Specificity**
- ✅ Use clear, direct language—avoid ambiguity
- ✅ Be specific about what you want (not "generate questions" but "generate 7-10 structured questions covering equipment, schedule, and goals")
- ✅ Define technical terms and acronyms
- ✅ Use concrete examples over abstract descriptions

### 2. **Structure & Organization**
- ✅ Use markdown headers (`**BOLD**`, `##`, `-`) for visual hierarchy
- ✅ Group related information together
- ✅ Use numbered lists for sequential steps
- ✅ Use bullet points for options, constraints, or features
- ✅ Separate sections with clear headers

### 3. **Context & Constraints**
- ✅ Provide sufficient context about the domain and use case
- ✅ Explicitly state what is IN scope and what is OUT of scope
- ✅ List constraints early (schema requirements, length limits, format rules)
- ✅ Include edge cases and special handling requirements
- ✅ Specify validation rules clearly

### 4. **Output Format Specification**
- ✅ Define exact schema/structure required (JSON, list format, etc.)
- ✅ Specify data types (string, number, array, boolean)
- ✅ Include field names exactly as expected
- ✅ Show example output structure
- ✅ Clarify required vs. optional fields

### 5. **Few-Shot Examples**
- ✅ Include 2-3 concrete examples showing input → output
- ✅ Cover different scenarios (simple, complex, edge cases)
- ✅ Show both correct and incorrect examples when helpful
- ✅ Use realistic, domain-specific examples
- ✅ Explain why examples are correct

### 6. **Personalization**
- ✅ Include user-specific information (age, experience, goals)
- ✅ Adapt language complexity to user level
- ✅ Reference user context throughout the prompt
- ✅ Make questions/recommendations relevant to the user

### 7. **Error Prevention**
- ✅ Anticipate common mistakes and explicitly prevent them
- ✅ Use "DO NOT" statements for critical restrictions
- ✅ Include validation checklist at the end
- ✅ Specify what to do in ambiguous cases
- ✅ Provide fallback instructions

### 8. **Task Decomposition**
- ✅ Break complex tasks into numbered steps
- ✅ Make each step actionable and specific
- ✅ Order steps logically (prerequisites first)
- ✅ Include decision points and branching logic when needed

### 9. **Language & Tone**
- ✅ Match the tone to the use case (professional, friendly, technical)
- ✅ Use consistent terminology throughout
- ✅ Avoid jargon unless necessary (and define it)
- ✅ Write in active voice when possible

### 10. **Testing & Iteration**
- ✅ Test prompts with edge cases
- ✅ Verify output matches schema requirements
- ✅ Check that examples are actually achievable
- ✅ Iterate based on actual AI outputs
- ✅ Document prompt versions for comparison

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

### Step-by-Step Process
```markdown
**STEP-BY-STEP PROCESS:**

Step 1: [Action]
- [Sub-action]
- [Sub-action]

Step 2: [Action]
- [Sub-action]
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

## Prompt Template

```markdown
**WHO YOU ARE:**
[Role and purpose]

**YOUR TASK:**
[Specific task with success criteria]

**CONTEXT:**
[Background information]
• ✅ Scope: [What's included]
• ❌ NOT included: [What's excluded]

**INPUT DATA:**
[What data is provided to the AI]

**CONSTRAINTS & REQUIREMENTS:**

1. **Category 1**
   - Rule 1
   - Rule 2

2. **Category 2**
   - Rule 1
   - Rule 2

**STEP-BY-STEP PROCESS:**

Step 1: [Action]
- [Sub-action]

Step 2: [Action]
- [Sub-action]

**OUTPUT REQUIREMENTS:**
- Format: [Structure]
- Fields: [List with types]
- Validation: [Rules]

**EXAMPLES:**

Example 1: [Scenario]
Input: [Input data]
Output: [Expected output]
Note: [Why this is correct]

**VALIDATION CHECKLIST:**
✓ [Requirement]
✓ [Requirement]
```

## Quality Checklist

Before finalizing a prompt, verify:

- [ ] Role and task are clearly defined
- [ ] Context provides sufficient background
- [ ] All constraints are explicitly stated
- [ ] Output format is precisely specified
- [ ] At least 2-3 examples are included
- [ ] Step-by-step process is clear and actionable
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









