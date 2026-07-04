---
name: release-notes
description: Generate GitHub release notes for Page Turner in the project's house style. Use when the user asks to write, draft, or update release notes / a changelog for a new version or GitHub release.
---

# Release notes

Generate GitHub release notes for Page Turner in the established house style: user-facing, plain-English, and organized by impact rather than by commit.

## Steps

1. **Find the version.** Read `manifest.json` for the current `version`. That is the release being written unless the user names a different one.

2. **Find the commit range.** The previous release is the most recent git tag (`git tag --sort=-v:refname | head`). List everything since it:
   ```
   git log <previous-tag>..HEAD --no-merges --pretty=format:'%h %s'
   ```
   If there is no matching tag, fall back to the last release documented in prior notes or ask the user for the starting point. Skip merge commits.

3. **Understand each change, don't just relay the subject line.** For anything non-trivial, look at the diff (`git show <hash>`) so you can explain *what the user experienced* and *why it happened* — not the mechanical change. The commit "Fix settings not saving: remove MV3-removed chrome.tabs.executeScript" becomes "Settings now save again — … `chrome.tabs.executeScript` was removed and threw before the save ran."

4. **Categorize** each change into one of:
   - **Bug fixes** — something that was broken now works. Lead with the user-visible symptom.
   - **Improvements** — enhancements to existing, already-working behavior (visuals, performance, security hardening).
   - **Under the hood** — internal cleanup, dead-code removal, dependency/manifest changes, and anything that affects permissions.
   Drop purely mechanical commits (version bumps, formatting-only, `.DS_Store`) unless they matter to users. Omit any section that has no items.

5. **Write the notes** to `release-notes/v<VERSION>.md` in the format below (see the existing `release-notes/v4.1.0.md` as the reference for exact formatting).

## Format

Markdown, using this exact structure:

```markdown
# Page Turner <version>

<One- or two-sentence summary of the release's character. Name the release type
(patch / minor / major) and the headline theme. Plain, confident, no marketing fluff.>

## Bug fixes

**<Symptom-first lead>**
<What was actually wrong, in plain terms, and confirmation it now works. Explanation
sits on its own line(s) directly under the bold lead — no bullet, no inline em-dash.>

**<Next symptom-first lead>**
<Explanation.>

## Improvements

**<Short lead>** — <benefit to the user, inline after an em-dash>. May be followed by
sub-bullets when the item covers several cases:

- **<Case>** — <detail>.
- **<Case>** — <detail>.

## Under the hood

- <Internal change, one line each.>
- No new permissions requested — <or, if permissions changed, state exactly what changed>.

### Full Changelog
https://github.com/n8kowald/page-turner/compare/<previous-version>...<version>
```

Formatting rules:
- **Headings:** `#` for the title, `##` for each section, `###` for Full Changelog.
- **Bug fixes** use the bold-lead-on-its-own-line style (lead, then explanation on the next line) — not a bulleted list, not an inline em-dash.
- **Improvements** use the inline `**Lead** — explanation` style, with optional sub-bullets.
- **Under the hood** is a bulleted list; the last bullet is always the permissions statement.
- **Full Changelog** compares the previous git tag to this version. Tags are bare version numbers (e.g. `4.0.1...4.1.0`), even though the note filename is `v`-prefixed.
- Omit any section (Bug fixes / Improvements / Under the hood) that has no items.

## Voice

- **Lead with the symptom, then the cause.** "Settings now save again — the popup's toggles silently stopped persisting when…". The reader cares what broke before they care why.
- **Explain root causes in accessible terms** but keep the real technical detail (API names, the actual mechanism) for readers who want it.
- **User benefit over implementation.** "crisp at any zoom level and on high-DPI displays" beats "replaced PNG with SVG."
- **Confident and plain.** No exclamation marks, no "we're excited to," no emoji.
- **Always close with a permissions statement** under "Under the hood" — either that no new permissions were requested, or precisely what changed. This is a browser extension; permission changes are the thing users scrutinize most.

## After drafting

Show the notes to the user for review. The notes live at `release-notes/v<VERSION>.md`. Do not create the git tag or publish the GitHub release unless asked; if asked, use `gh release create <version> --notes-file release-notes/v<VERSION>.md`.
