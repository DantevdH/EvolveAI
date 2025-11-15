# Documentation Structure Template

Concise, action-oriented structure for production readiness docs.

## Document Structure

```markdown
# [Component] - Production Readiness

**Status**: [ ]% Complete | Last Updated: [Date]

---

## 🔴 CRITICAL (Must Fix Before TestFlight)

- [ ] **Item description** - `file/path.ts:line` - [What to fix]
- [ ] **Item description** - `file/path.ts:line` - [What to fix]

---

## 🟡 IMPORTANT (Should Fix Before App Store Release)

- [ ] **Item description** - `file/path.ts:line` - [What to fix]
- [ ] **Item description** - `file/path.ts:line` - [What to fix]

---

## 🟢 NICE TO HAVE (Can Fix After Public Launch)

- [ ] **Item description** - `file/path.ts:line` - [What to fix]
- [ ] **Item description** - `file/path.ts:line` - [What to fix]

---

## 📋 Quick Reference

**Environment Variables:**
- `VAR_NAME` - Description (Required/Optional)

**Key Files:**
- `path/to/file.ts` - Purpose

**Related Docs:**
- [Link to related doc]
```

## Format Guidelines

### Priority Colors (Deployment Timeline)
- 🔴 **CRITICAL** - Must fix before TestFlight (Apple beta testing)
- 🟡 **IMPORTANT** - Should fix before App Store public release
- 🟢 **NICE TO HAVE** - Can fix after public launch

### Checklist Item Format
```
- [ ] **Brief description** - `file/path.ts:line` - Specific action needed
```

**Example:**
```
- [ ] **Validate API keys at startup** - `backend/settings.py:51` - Add validation check
- [ ] **Remove console.logs** - `frontend/src/**/*.tsx` - Replace with proper logging
```

### Keep It Simple
- One line per item
- Direct action statement
- Include file path when relevant
- No verbose explanations in checklist
- Use notes section only for complex decisions

### Status Tracking
- ✅ = Done
- [ ] = Todo
- ⚠️ = Blocked (add note why)

---

**Deployment Timeline:**
1. **TestFlight** (Beta) - Critical items must be done
2. **App Store** (Public) - Important items should be done
3. **Post-Launch** - Nice to have items can wait

**Goal**: Make it immediately clear what needs fixing for each deployment stage.

