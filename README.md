# Safe YouTube

Safe YouTube is a simple Next.js app for parents who want better common-sense parental controls for YouTube.

It is meant for one job:

1. Fork the repo
2. Edit one friendly config file
3. Deploy it to Vercel for free
4. Open it on an iPad as a PWA

You do not need a database.
You do not need a YouTube API key.
You do not need to be technical to use the basic setup.

## Who This Is For

This project is mainly for parents who want to:

- block obvious garbage by keyword
- only allow trusted channels
- only allow exact videos
- make rapid video-hopping less rewarding
- deploy a private family version without building a complicated system

## The Main Idea

Instead of giving a child normal YouTube, this app gives them a filtered wrapper.

You control the rules in `safe-youtube.config.jsonc`.

That file can do all of this:

- `categories`: big home-screen buttons that parents define in the config
- `blocklist` mode: normal search, but hide results that match blocked words, channels, or videos
- `allowlist` mode: only show approved searches, approved channels, or approved videos
- feature trusted channels on the home page
- feature parent-picked videos on the home page
- turn on a rapid-switch guard that slows down constant video hopping

## The Only File Most Parents Need To Edit

The main file is:

`safe-youtube.config.jsonc`

It uses `jsonc`, which means it can include comments. The comments inside the file explain what each setting does in plain language.

## Start With A Preset

This repo includes ready-made sample configs in `sample-configs/`.

Available presets:

- `sample-configs/01-parent-starter-blocklist.jsonc`
- `sample-configs/02-approved-channels-only.jsonc`
- `sample-configs/03-slower-switching.jsonc`
- `sample-configs/04-exact-videos-only.jsonc`

If you do not want to start from scratch:

1. Open one of the files in `sample-configs/`
2. Copy everything in it
3. Paste it into `safe-youtube.config.jsonc`
4. Change the text, channels, words, or video links to fit your child

## Fastest Setup

If you want the shortest path:

1. Fork this repo on GitHub
2. Copy one preset from `sample-configs/` into `safe-youtube.config.jsonc`
3. Edit the words, channels, or videos
4. Import your fork into Vercel
5. Click Deploy
6. Open the site on the iPad in Safari
7. Use Share -> Add to Home Screen

## Step By Step For Non-Technical Parents

### 1. Fork The Repo

1. Open this repository on GitHub
2. Click **Fork** in the top right
3. Keep the default options unless you know you want something different
4. Wait for GitHub to create your own copy

After that, you will have your own version of the project in your GitHub account.

### 2. Pick A Sample Config Or Use The Default One

If you want a head start:

1. Open the `sample-configs` folder in your fork
2. Pick the sample that is closest to what you want
3. Open that file
4. Copy everything in it
5. Open `safe-youtube.config.jsonc`
6. Replace its contents with the sample you copied

If you prefer, you can skip this and just edit `safe-youtube.config.jsonc` directly.

### 3. Edit The Config File On GitHub

1. Open `safe-youtube.config.jsonc`
2. Click the pencil icon
3. Change the values you want
4. Scroll down and save the file

In most cases, you only need to:

- change words inside quotes
- add or remove lines inside lists
- edit the `categories` buttons
- switch between `blocklist` and `allowlist`
- turn the rapid-switch guard on or off

### 4. Deploy To Vercel For Free

1. Go to Vercel
2. Sign in with GitHub
3. Click **Add New** and then **Project**
4. Choose your fork of this repository
5. Leave the default settings alone unless you already know you need something different
6. Click **Deploy**
7. Wait for the first deployment to finish
8. Open the live URL Vercel gives you

There are no environment variables required for the default setup.

If you already have a live copy of the app, you can also open `/jsonc-checker`
on that site and paste your config there before your next deployment.

### 5. Add It To The iPad Home Screen

1. Open your deployed site in Safari on the iPad
2. Tap the Share button
3. Tap **Add to Home Screen**
4. Open it from the new icon

It will feel more like an app and less like a normal browser tab.

## Two Main Filtering Styles

### Option A: `blocklist`

Use this if you want YouTube search to feel mostly normal, but with obvious junk filtered out.

Example:

```jsonc
"mode": "blocklist",
"blockedWords": ["horror", "gore", "violence", "prank"],
"blockedChannels": [],
"blockedVideos": []
```

What it does:

- lets the child search normally
- hides results that match blocked words
- hides results from blocked channels
- hides exact blocked videos

### Option B: `allowlist`

Use this if you want the stricter approach.

Example:

```jsonc
"mode": "allowlist",
"allowedSearchTerms": ["animals", "space", "drawing"],
"allowedChannels": ["SciShow Kids", "Art for Kids Hub"],
"allowedVideos": []
```

What it does:

- only shows approved content
- can approve by topic, by channel, by exact video, or all three
- works well for younger kids

## Rapid Video Switching Guard

This is the extra behavior you asked for to discourage constant video-hopping.

The config block is:

```jsonc
"videoSwitchingControl": {
  "enabled": true,
  "mode": "confirm",
  "maxSwitchesInWindow": 2,
  "windowSeconds": 180,
  "cooldownSeconds": 25,
  "title": "Take a breath before the next video",
  "message": "This parent setting adds a calm pause when videos are switched too quickly.",
  "buttonText": "Open the next video"
}
```

What the settings mean:

- `enabled`: turns the feature on or off
- `mode: "cooldown"`: after the pause, the video opens automatically
- `mode: "confirm"`: after the pause, the child must tap a button to continue
- `maxSwitchesInWindow`: how many quick switches are allowed before the pause starts
- `windowSeconds`: how far back the app looks when counting switches
- `cooldownSeconds`: how long the pause lasts
- `title`, `message`, `buttonText`: the text shown during the pause screen

Practical advice:

- use `cooldown` if you want something gentle
- use `confirm` if you want rapid switching to feel more annoying and less rewarding
- start with a short pause like 15 or 20 seconds

## What Each Setting Means

Inside `safe-youtube.config.jsonc`:

- `siteTitle`: the app name
- `siteDescription`: short browser and home-screen description
- `welcomeMessage`: text shown on the home page
- `mode`: `"blocklist"` or `"allowlist"`
- `categories`: big topic buttons on the home page
- `featuredVideos`: full YouTube links shown on the home page
- `featuredChannels`: trusted channels shown on the home page
- `blockedWords`: hide results whose title, description, or channel matches these terms
- `blockedChannels`: hide results from these channels
- `blockedVideos`: hide exact videos by link or video ID
- `allowedSearchTerms`: in allowlist mode, only searches matching these terms are allowed
- `allowedChannels`: in allowlist mode, only videos from these channels are allowed
- `allowedVideos`: in allowlist mode, only these exact videos are allowed
- `videoSwitchingControl`: slows rapid switching between videos
- `theme.accentColor`: main button color
- `theme.accentTint`: softer accent color

## Good Starter Setups

### Everyday Family Starter

Use:

- `sample-configs/01-parent-starter-blocklist.jsonc`

This is good if you want:

- a normal search box
- some obvious junk blocked
- a few trusted channels featured

### Younger Kids Or Tighter Rules

Use:

- `sample-configs/02-approved-channels-only.jsonc`

This is good if you want:

- only trusted channels
- topic approval
- a mild rapid-switch pause

### Calm Mode Or Bedtime Mode

Use:

- `sample-configs/03-slower-switching.jsonc`

This is good if you want:

- calmer search terms
- stricter switching friction
- a gentler feel overall

### Exact Videos Only

Use:

- `sample-configs/04-exact-videos-only.jsonc`

This is good if you want:

- no open browsing
- only a small list of exact videos
- the tightest setup

## Updating The Rules Later

When you want to change the app later:

1. Open your fork on GitHub
2. Edit `safe-youtube.config.jsonc`
3. Save the change
4. Wait for Vercel to redeploy

That is the normal maintenance flow.

## Running It Locally

If you want to run it on your own computer:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`

To test a production build:

```bash
npm run build
npm start
```

## Project Notes

- the app reads its rules from `safe-youtube.config.jsonc`
- search results are filtered before they are shown
- the watch page also respects the rules, so direct video links are still checked
- the rapid-switch guard runs in the browser so it can react to how quickly a child opens new videos
- the app includes a manifest and service worker so it can be added to an iPad home screen
- ad-free playback depends on YouTube and YouTube Premium, not on this app itself
- the `/jsonc-checker` page can validate pasted config text and provide a cleaned copy

## Good First Edit

If you want the smallest possible first change, edit just these fields:

```jsonc
"siteTitle": "Maya's Safe YouTube",
"categories": [
  { "label": "Animals", "query": "animals for kids" },
  { "label": "Drawing", "query": "drawing for kids" },
  { "label": "Space", "query": "space for kids" }
],
"mode": "blocklist",
"blockedWords": ["horror", "violence", "prank"],
"videoSwitchingControl": {
  "enabled": true,
  "mode": "cooldown",
  "maxSwitchesInWindow": 3,
  "windowSeconds": 180,
  "cooldownSeconds": 15,
  "title": "Pause before the next video",
  "message": "Fast switching can make YouTube harder to stop. Take a short pause before opening another video.",
  "buttonText": "Continue to the video"
}
```

That is enough to get a useful first version online.
