# LinkedIn ChatterScan

A Manifest V3 Chrome extension that shows a reader-style Chrome side panel for LinkedIn feed posts that match your filters.

The extension reads already-rendered LinkedIn feed cards and leaves the LinkedIn page itself untouched. It does not automate browsing, click LinkedIn controls, replay LinkedIn network calls, use a proxy, or remove/hide items from the real LinkedIn feed.

## Where It Runs

- The Chrome side panel is enabled on LinkedIn pages, including `https://www.linkedin.com/feed/`, `https://www.linkedin.com/search/results/all/`, and `https://www.linkedin.com/search/results/content/`.
- The content script scans LinkedIn feed and search result cards that have already rendered in the browser.
- The extension icon opens the native Chrome side panel when the current tab is a supported LinkedIn page.
- Other LinkedIn pages and non-LinkedIn pages do not show the ChatterScan side panel entry.

## Default Filters

ChatterScan uses include-based filters. By default it includes focused link-based posts and excludes broader/noisier categories.

On by default:

- Include posts with useful links in the post body.
- Include posts with useful links in rendered comments.
- Count LinkedIn content links in post body and rendered comments.

Off by default:

- Include ads.
- Include posts with Pulse article preview cards.
- Include posts with embedded video.
- Include posts without useful links, Pulse previews, or embedded video.

Profile, header, reaction, and author CTA links are ignored when deciding whether a post has a useful link. Pulse preview cards use their own include setting.

## Reader Panel

The side panel shows selected posts with:

- The detected author, linked to their LinkedIn profile when available.
- Context such as `commented by Michael Bolton` when LinkedIn renders it.
- The post date and a verified `Open LinkedIn post` link when LinkedIn renders a canonical `/posts/` URL or matching activity/UGC URN.
- No post-link fallback when LinkedIn does not render a verified post id or canonical post URL.
- Full detected post text with paragraph breaks.
- Labelled link sections for post-body, rendered-comment, and Pulse article links.
- An `Embedded video detected` label when LinkedIn renders a video player. The side panel does not try to play LinkedIn `blob:` video URLs.

Collected posts stay stable while LinkedIn virtualizes the feed. ChatterScan associates feed cards and reader cards with the same `data-linkedin-chatterscan-id`, preferring LinkedIn activity/post IDs when present and using a per-card fallback otherwise.

## Side Panel Sections

The side panel uses collapsed details sections by default for:

- Filters.
- Stats.
- AI capabilities.
- Muted people.
- Saved posts.
- Forbidden phrase matches.
- Ignored because of prompt.

The stats section shows scanned, selected, collected, and excluded counts, including ads out, link posts out, comment-link out, Pulse out, video out, muted out, forbidden phrase out, included phrase in, and no-link out.

Recent scan log messages are shown at the bottom of the side panel.

## Per-Post Actions

Each collected post can be removed with `[x]` buttons in all four card corners. Removed posts stay hidden for the current browser session and can be restored from the side panel.

The side panel header has a `Clear All` button that removes every post currently shown in the reader feed for the current browser session. It does not delete or change saved posts.

Each included post can be saved with `[save]`. Saved posts are stored in local storage, reload as collapsed details rows, and can be deleted from local storage.

Each included post has a `[mute]` button next to the author. Muted people are stored in local storage, excluded from future reader results, counted in stats, and can be unmuted from the Muted section. Muted names link to their LinkedIn profile when available.

## Included Phrases

The Options page lets you add or remove exact-match included phrases.

When a post text contains an included phrase, ChatterScan includes it in the reader before applying the normal source filters. This can include posts without useful links, posts with disabled link/comment/Pulse/video sources, and ads when the included phrase matches.

Included phrase matches show a small `included: "phrase"` label next to the poster name.

Included phrase matching is literal, case-insensitive text matching with whitespace normalized. It is not a regex system.

## Forbidden Phrases

The Options page lets you add or remove exact-match forbidden phrases.

Forbidden phrases have the highest precedence. When a post text contains a forbidden phrase, ChatterScan ignores it before applying included phrases, source filters, AI prompt topics, or summarization.

Forbidden matches are counted in stats as `Forbidden phrase out`. The matching post is not rendered in the reader or in the forbidden section.

Forbidden phrase matching is literal, case-insensitive text matching with whitespace normalized. It is not a regex system.

## AI Capabilities

The side panel has an AI capabilities details section. It reports the current status of:

- Chrome Prompt API.
- Chrome Summarizer API.

If an API is unavailable, not supported, or needs a model download, the status message is shown there.

## AI Prompt Topics

When Chrome's Prompt API is available, the Options page shows AI prompt topics.

You can add simple ignore instructions such as:

- `ignore job adverts`
- `ignore posts selling courses`
- `ignore all posts related to cows`

The extension does not use the raw instruction as a loose yes/no question. It first asks the Prompt API to convert the instruction into a strict filtering rubric. Posts are then classified against that rubric. A post is moved into the collapsed Ignored because of prompt section only when the classifier returns a high-confidence match with exact evidence from the post.

Ignored-by-prompt cards show the matching topic next to the poster name. If a post was already summarized before it moved into the ignored section, that summary stays with the post.

## AI Summaries

When Chrome's Summarizer API is available, each post included in the main feed gets a short plain-text summary.

The summary appears in bold below the author/date/meta details and above the full post text.

While the Summarizer API is working, the post shows:

```text
Generating summary for post...
```

The placeholder is replaced by the generated summary when complete. If summarization fails for that post, the placeholder is removed.

Summaries are cached in memory by post key and text while the side panel is open, so re-rendering the same post does not repeatedly summarize it. Summaries are not saved to local storage.

## Options Page

The Options page includes:

- Include ads.
- Include posts with links.
- Include posts with links in comments.
- Include posts with Pulse articles.
- Include posts with embedded video.
- Include posts without links.
- Count LinkedIn content links.
- Included phrase management.
- Forbidden phrase management.
- AI prompt topic management, visible only when the Prompt API is available.
- Local storage usage.
- Clear local storage.

Clearing local storage removes saved settings, saved posts, muted people, included phrases, forbidden phrases, and AI prompt topics.

## Storage

Session storage:

- Collected reader state.
- Removed/dismissed post keys.

Local storage:

- Saved settings.
- Saved posts.
- Muted people.
- Included phrases.
- Forbidden phrases.
- AI prompt topics.

AI summaries are held in memory in the side panel and are not persisted.

## Install Locally

1. Open `chrome://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `D:\github\chatterscan\linkedin-chrome-extension`.
5. Open `https://www.linkedin.com/feed/`, `https://www.linkedin.com/search/results/all/`, or `https://www.linkedin.com/search/results/content/`.
6. Click the extension icon to open the side panel.
7. Scroll LinkedIn manually to scan more rendered feed cards.

After changing files locally, click the extension's `Reload` button on `chrome://extensions` and refresh LinkedIn.

## Run Tests

Run the unit tests with:

```powershell
npm test
```

## How To Tell It Is Working

When the LinkedIn feed loads, click the extension icon to open the `ChatterScan Reader` side panel. It shows:

- Current filter summary.
- Scan and exclusion stats.
- AI capability status.
- Matching posts.
- Collapsed saved, muted, forbidden, and ignored sections.
- Recent extension log messages when matching posts are added.

If the side panel stays empty, open or refresh a supported LinkedIn feed or search results page so the content script can scan rendered cards.

## Account And Policy Note

This extension is a personal reader/customization tool. LinkedIn may still object to extensions that alter its service presentation, especially reader views that omit advertising. Use it with realistic expectations: there is no ban-proof browser customization for a third-party site.
