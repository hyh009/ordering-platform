# Temporary Checklist Workflow

Use this guide when the user asks the agent to track work in a temporary checklist.

## Location

Put temporary checklist files in:

```txt
docs/agent/temp/
```

Do not put permanent instructions in `docs/agent/temp`.

## File Name

Use a short title and local date/time:

```txt
<short-title>-YYYYMMDD-HHMM.md
```

Example:

```txt
frontend-error-feedback-design-20260507-2038.md
```

## Checklist

Keep the checklist short.

Use Markdown task items:

```md
- [ ] Add guide.
- [ ] Register guide.
- [ ] Verify changes.
- [ ] Wait for user confirmation before removing this temporary checklist file.
```

Update the file as work progresses.

Mark each item done soon after completing it.

## Cleanup

Before finishing:

- verify the requested work
- mark verification done
- report that the temporary checklist is ready to remove
- wait for user confirmation

After the user confirms cleanup:

- delete the temporary checklist file
- confirm `docs/agent/temp` has no leftover task file for the finished task

Temporary checklist files should not be committed.
