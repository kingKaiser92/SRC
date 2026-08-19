# Strava brand assets

`strava.html` renders the official **Powered by Strava** mark from this folder.

## Needed file

`powered-by-strava.svg` — the **white** variant (the page background is `#0A0A0A`).

Download it from <https://www.strava.com/brand>, under the API / attribution
logos section, and save it here with exactly that filename.

## Why the official file

Strava's brand guidelines require their supplied asset. A hand-drawn or
recreated wordmark is a compliance failure in the API application review, so
this file is not generated — it is downloaded.

## Until it's added

The page degrades gracefully: an `onerror` handler on the `<img>` reveals a
text credit set in Strava orange, so nothing renders broken. The trademark
disclaimer below it is always present either way.
