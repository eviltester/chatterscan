# LinkedIn ChatterScan

A small Manifest V3 Chrome extension that shows a Chrome side panel reader for LinkedIn feed posts that match your filters.

## What it does

- Leaves the LinkedIn feed untouched.
- Shows matching posts in Chrome's native side panel.
- Keeps a lightweight LinkedIn content script for scanning already-rendered feed cards, then sends reader state to the side panel.
- Shows the full detected post text with paragraph breaks, a best-effort link to the LinkedIn post, and a labelled `Links in post` section.
- Only treats links inside the post body/commentary as useful links; profile, header, and author CTA links are ignored.
- Includes posts with links by default; ads and posts without links are opt-in.
- Links the detected post author to their profile when available, and shows linked context such as `commented by Michael Bolton`.
- Opens the actual LinkedIn post in a new tab when a verified canonical `/posts/` URL or activity/UGC URN is available.
- Omits the post link when LinkedIn does not render a verified post id or canonical post URL for that card.
- Associates feed cards and reader cards with the same `data-linkedin-chatterscan-id`, using LinkedIn activity/post IDs when present and a per-card fallback otherwise.
- Rejects oversized feed roots that contain multiple `Feed post` headings so links from several posts are not merged into one reader card.
- Treats feed cards that look like ads as opt-in, using visible markers such as `Promoted` or `Sponsored`.
- Treats posts without body/commentary links as opt-in.
- Ignores author/profile/action links when deciding whether a post has a useful link.
- Shows scan counts and recent log messages.
- Keeps collected posts stable while LinkedIn virtualizes the feed, and logs only when the reader collection changes.
- Stores configuration locally in Chrome extension storage.

## Install locally

1. Open `chrome://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `D:\github\linkedin-chatterscan`.
5. Open LinkedIn, click the extension icon to open the side panel, and scroll manually to scan more feed cards.

After changing files locally, click the extension's `Reload` button on `chrome://extensions` and refresh LinkedIn.

## Run tests

Run the unit tests with:

```powershell
npm test
```

## How to tell it is working

When LinkedIn loads, click the extension icon to open the `ChatterScan Reader` side panel. It shows:

- how many feed cards were scanned,
- how many posts were selected,
- how many ads, link posts, and no-link posts were outside the current include settings,
- recent extension log messages when matching posts are added.

If the side panel stays empty, open or refresh a LinkedIn tab so the content script can scan the rendered feed.

## Account and policy note

This extension does not automate browsing, click anything, replay LinkedIn network calls, use a proxy, or remove/hide LinkedIn feed items. It only reads already-rendered cards and shows selected summaries in Chrome's side panel.

LinkedIn may still object to extensions that alter its service presentation, especially reader views that omit advertising. Use it as a personal tool and keep expectations realistic: there is no ban-proof browser customization for a third-party site.
