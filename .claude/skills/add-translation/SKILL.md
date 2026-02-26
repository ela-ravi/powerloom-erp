---
name: add-translation
description: Add i18n translation keys for English and Tamil
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: [module-name]
---

Add translation keys for the module or feature `$ARGUMENTS`.

## Step 1: Generate Template

Run the template generator:

```bash
pnpm gen:translation $0
```

This creates `src/i18n/_generated/<module>.i18n.json` with:

- en + ta key structure
- Categories: pageTitle, form, button, table, status, error, success
- TODO placeholders for Tamil translations

## Step 2: Customize

1. Read existing translation files to follow the established key structure and format.
2. All user-facing strings MUST use translation keys — never hardcode strings.
3. Fill in TODO sections: form field labels, table columns, status labels, Tamil translations.

## Key Format

Use dot-notation with this hierarchy:

```
module.section.label
```

Examples:

```
inventory.cone.stock         → "Cone Stock" / "கோன் இருப்பு"
production.wager.return      → "Production Return" / "உற்பத்தி திருப்பி"
wages.advance.balance        → "Advance Balance" / "முன்பணம் இருப்பு"
common.actions.save          → "Save" / "சேமி"
common.actions.cancel        → "Cancel" / "ரத்து"
common.actions.delete        → "Delete" / "நீக்கு"
```

## What to Add

For the specified module, add keys for:

1. **Page titles** — `module.page.title`
2. **Form labels** — `module.form.field_name`
3. **Button labels** — `module.actions.action_name`
4. **Table headers** — `module.table.column_name`
5. **Status labels** — `module.status.status_name`
6. **Error messages** — `module.errors.error_type`
7. **Success messages** — `module.success.action_name`
8. **Tooltips/help text** — `module.help.context`

## Languages

- **English (en)**: Write the actual English string
- **Tamil (ta)**: Write the Tamil translation. If unsure, add the English string with a `// TODO: verify Tamil translation` comment

## Domain-Specific Terms (Tamil)

Reference these common translations:

- Fabric → துணி
- Cone → கோன்
- Wager → நெசவாளர்
- Paavu → பாவு
- Oodai → ஊடை
- Godown → கிடங்கு
- Loom → தறி
- Batch → தொகுதி
- Wage → கூலி
- Advance → முன்பணம்
- Damage → சேதம்
- Invoice → பில்
- Stock → இருப்பு
- Production → உற்பத்தி

## Output

Show the added keys in both languages side by side for review.
