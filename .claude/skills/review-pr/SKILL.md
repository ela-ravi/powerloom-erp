---
name: review-pr
description: Review a PR with domain-specific checklist for Powerloom ERP
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash(gh *)
argument-hint: [pr-number]
---

Review PR #$0 for the Powerloom ERP project.

## Steps

1. Fetch the PR diff: `gh pr diff $0`
2. Fetch PR description: `gh pr view $0`
3. Review all changed files against the checklist below

## Review Checklist

### Tenant Isolation (CRITICAL)
- [ ] Every new table has `tenant_id` column
- [ ] Every query is scoped by `tenant_id`
- [ ] RLS policies are added for new tables
- [ ] API middleware enforces tenant scoping
- [ ] No cross-tenant data leakage possible

### Business Logic
- [ ] Wager type logic is correct (Type 1&3 = weight-based, Type 2&4 = count-based)
- [ ] Wage calculations follow the formula: Gross - Advance - Damage = Net Payable
- [ ] Damage requires owner approval before deduction
- [ ] Batch linkage is conditional (only when tenant has batching enabled)
- [ ] GST auto-detection logic is correct (intra-state vs inter-state)
- [ ] Stock stage transitions follow the 6-stage pipeline

### Code Quality
- [ ] TypeScript types are correct, no `any`
- [ ] Input validation on system boundaries
- [ ] Error handling is appropriate
- [ ] No hardcoded tenant-specific values
- [ ] No hardcoded user-facing strings (must use i18n keys)

### UX (if UI changes)
- [ ] Touch targets >= 48px
- [ ] Forms minimize manual entry (auto-calculate where possible)
- [ ] Stage transitions are one-tap actions
- [ ] Confirmation dialogs on irreversible actions
- [ ] Translation keys added for English AND Tamil

### Database
- [ ] Migrations include `tenant_id`, `created_at`, `updated_at`
- [ ] Proper indexes added
- [ ] Foreign keys reference correct tables
- [ ] No destructive migrations without a rollback plan

### Security
- [ ] No exposed secrets or credentials
- [ ] Input sanitization on user-provided data
- [ ] Role-based access enforced (Owner/Staff/Wager/Tailor/Packager)
- [ ] Self-service roles can only see their own data

## Output Format

Organize findings by severity:
1. **Blockers** — Must fix before merge
2. **Warnings** — Should fix, but not blocking
3. **Suggestions** — Nice to have improvements
4. **Praise** — Good patterns worth highlighting
