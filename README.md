# Safe YouTube

Safe YouTube is a simple Next.js web app that acts like a filtered YouTube wrapper.

You do **not** need a database.
You do **not** need a YouTube API key.
You do **not** need to install coding tools on your computer if you only want to:

1. Fork the repo
2. Edit one config file
3. Deploy it to Vercel

It also works as a PWA, so you can add it to an iPad home screen and open it like an app.

## What This Is Good For

- Families who want a calmer version of YouTube
- Teachers who want a school-safe search page
- Therapists or caregivers who want a small list of approved videos or channels
- Anyone who wants a free and easy deploy on Vercel

## The Only File Most People Need To Edit

The main file is:

`safe-youtube.config.jsonc`

That file controls:

- The app title
- The welcome message
- Quick search buttons
- Blocked words
- Blocked channels
- Blocked videos
- Allowed search terms
- Allowed channels
- Allowed videos
- Featured videos on the home page
- Featured channels on the home page

`jsonc` means it is like JSON, but with comments. The comments inside the file explain what each setting does.

## Fastest Setup

If you want the easiest possible path:

1. Fork this repo on GitHub.
2. Edit `safe-youtube.config.jsonc` in the GitHub website.
3. Import your fork into Vercel.
4. Click deploy.
5. Open the site on your iPad in Safari.
6. Use **Share** -> **Add to Home Screen**.

## Step By Step For Non-Technical Users

### 1. Fork The Repo

1. Open this repository on GitHub.
2. Near the top right, click **Fork**.
3. Keep the default options unless you know you want something different.
4. Wait for GitHub to create your own copy.

After that, you will have your own version of the project in your GitHub account.

### 2. Edit The Config File On GitHub

1. In your fork, open `safe-youtube.config.jsonc`.
2. Click the pencil icon to edit it.
3. Change the text and lists you want.
4. Scroll down and save the file with the default commit form.

You usually only need to edit the words inside quotes or add new lines inside the lists.

### 3. Choose A Filter Style

There are two main modes.

#### Option A: `blocklist`

Use this if you want normal YouTube searching, but with some content hidden.

Example:

```jsonc
"mode": "blocklist",
"blockedWords": ["horror", "gore", "violence", "prank"],
"blockedChannels": ["@SomeChannel"],
"blockedVideos": []
```

What it does:

- Search still works normally
- Results are hidden if they match blocked words
- Results are hidden if they come from blocked channels
- Results are hidden if they match blocked video IDs or links

#### Option B: `allowlist`

Use this if you want the strictest setup.

Example:

```jsonc
"mode": "allowlist",
"allowedSearchTerms": ["animals", "space", "drawing"],
"allowedChannels": ["@SciShowKids", "@ArtforKidsHub"],
"allowedVideos": [
  "https://www.youtube.com/watch?v=VIDEO_ID_HERE"
]
```

What it does:

- Only approved content is shown
- You can approve by topic, by channel, by exact video, or all three
- This is the safest option if you only want a narrow set of results

## What Each Setting Means

Inside `safe-youtube.config.jsonc`:

- `siteTitle`: The app name.
- `siteDescription`: Short description for the browser and home screen.
- `welcomeMessage`: Text shown on the home page.
- `mode`: Either `"blocklist"` or `"allowlist"`.
- `quickSearches`: Buttons shown on the home page for one-tap searches.
- `featuredVideos`: Full YouTube links you want to pin on the home page.
- `featuredChannels`: Channel handles, names, or full URLs you want to feature.
- `blockedWords`: Hide any result whose title, description, or channel matches these terms.
- `blockedChannels`: Hide results from these channels.
- `blockedVideos`: Hide exact videos by link or by YouTube video ID.
- `allowedSearchTerms`: In allowlist mode, only searches matching these terms are allowed.
- `allowedChannels`: In allowlist mode, only videos from these channels are allowed.
- `allowedVideos`: In allowlist mode, only these exact videos are allowed.
- `theme.accentColor`: Main button color.
- `theme.accentTint`: Soft accent background color.

## Easy Copy-Paste Examples

### Family-Safe Example

```jsonc
"mode": "blocklist",
"blockedWords": ["prank", "horror", "gore", "violence", "politics"],
"blockedChannels": [],
"blockedVideos": [],
"quickSearches": ["animal facts", "drawing for kids", "space for kids"]
```

### School Example

```jsonc
"mode": "allowlist",
"allowedSearchTerms": ["math", "science", "phonics", "geography"],
"allowedChannels": ["@SciShowKids"],
"allowedVideos": [],
"featuredChannels": ["@SciShowKids"]
```

### Pure Curated Home Screen Example

```jsonc
"mode": "allowlist",
"allowedSearchTerms": [],
"allowedChannels": [],
"allowedVideos": [
  "https://www.youtube.com/watch?v=VIDEO_ID_1",
  "https://www.youtube.com/watch?v=VIDEO_ID_2"
],
"featuredVideos": [
  "https://www.youtube.com/watch?v=VIDEO_ID_1",
  "https://www.youtube.com/watch?v=VIDEO_ID_2"
]
```

## Deploy To Vercel For Free

Once your config file looks right:

1. Go to Vercel.
2. Sign in with GitHub.
3. Click **Add New** and then **Project**.
4. Choose your fork of this repository.
5. Leave the default project settings alone unless you already know you need something different.
6. Click **Deploy**.
7. Wait for the first deployment to finish.
8. Open the live URL Vercel gives you.

That is enough for most people. There are no environment variables required for the default setup.

## Add It To An iPad Home Screen

1. Open your deployed site in **Safari** on the iPad.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Open it from the new icon on the home screen.

It will behave more like an app and less like a normal browser tab.

## How To Update It Later

When you want to change the rules later:

1. Open your fork on GitHub.
2. Edit `safe-youtube.config.jsonc`.
3. Save the change.
4. Wait for Vercel to redeploy the site.

That is the normal maintenance flow.

## If You Want To Work Locally

If you do want to run it on your own computer:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

To test a production build:

```bash
npm run build
npm start
```

## Project Notes

- The app reads your rules from `safe-youtube.config.jsonc`.
- Search results are filtered on the server before they are shown.
- The app includes a manifest and service worker so it can behave like a PWA.
- The watch page also respects the current rules, so direct links are still filtered.

## Good First Change

If you are not sure where to start, edit only these fields first:

```jsonc
"siteTitle": "My Safe YouTube",
"mode": "blocklist",
"blockedWords": ["horror", "violence", "prank"],
"quickSearches": ["animals", "drawing", "space"]
```

That is enough to get a first version online quickly.
