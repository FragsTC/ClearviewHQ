# Clearview HQ on Netlify

Your team's EOS hub: Level 10 meetings, Scorecard, Rocks, Issues, To-Dos, Seats, People, and V/TO. Everyone shares the same data, protected by a passcode.

## What's in this folder

- `public/index.html` is the app.
- `netlify/functions/data.mjs` is the small server that saves and loads your data.
- `netlify/functions/seed.json` holds your starting data (team, seats, Scorecard, issues). It's only used the very first time.
- `netlify.toml` and `package.json` tell Netlify how to build it.

## Deploy it (about 10 minutes)

Netlify Drop (drag and drop) won't work here, because Drop doesn't build functions. Use one of these two options.

### Option A: GitHub (easiest to update later)

1. Create a new **private** GitHub repo and upload everything in this folder.
2. In Netlify, choose **Add new project**, then **Import an existing project**, and pick the repo. Leave the build settings as they are, since `netlify.toml` covers them.
3. Before the first deploy finishes, go to **Project configuration**, then **Environment variables**, and add:
   - `TEAM_PASSCODE`: the code everyone uses (for example `squeegee-2027`)
   - `ADMIN_PASSCODE`: a different code for you and Daniel only. It unlocks the People tab.
4. Go to **Deploys**, then **Trigger deploy**, so the passcodes take effect.

### Option B: Netlify CLI

```
npm install -g netlify-cli
cd clearview-hq
npm install
netlify login
netlify init
netlify env:set TEAM_PASSCODE "your-team-code"
netlify env:set ADMIN_PASSCODE "your-admin-code"
netlify deploy --prod
```

## Using it

- Open the site and enter a passcode. Each device remembers it until someone taps **Sign out** at the bottom of the page.
- **Team passcode:** can use and change everything except the People tab.
- **Admin passcode:** can do everything, including People Analyzer and quarterly conversations.
- Changes show up on other people's screens within about 3 seconds.
- The **Tangent!** button during a meeting pops the alert on everyone's screen within a few seconds.

## Changing a passcode

Update the environment variable in Netlify and redeploy. Everyone will be asked for the new code the next time they open the site.

## Good to know

- Data lives in Netlify Blobs on your Netlify account, in a store called `clearview-hq`. Redeploying the site does not erase it.
- The passcode keeps casual visitors out. It is not the same as individual logins, so share it only with the leadership team, and change it if someone leaves.
- The site is hidden from search engines.
