# looktime_pro

This project is prepared to be published to GitHub under the repository name `looktime_pro`. Follow the steps below to create the new repository and push the existing code.

## Create the GitHub repository

1. Visit [github.com/new](https://github.com/new) and create a repository named **looktime_pro** (leave it empty without a README or license so that the history from this project can be pushed cleanly).
2. Copy the repository URL. You can choose either the SSH or HTTPS variant depending on your GitHub configuration.

## Push this project to GitHub

```bash
# Step 1: Clone the current project locally if you have not done so already.
git clone <CURRENT_PROJECT_GIT_URL>
cd solo-booking-bot

# Step 2: Update the remote to point to the new GitHub repository.
git remote remove origin
# Replace <YOUR_GITHUB_USERNAME> with your GitHub account name.
git remote add origin git@github.com:<YOUR_GITHUB_USERNAME>/looktime_pro.git

# Step 3: Push the existing history to GitHub.
git push -u origin main
```

If you prefer using HTTPS instead of SSH, replace the `git@github.com:` URL with `https://github.com/<YOUR_GITHUB_USERNAME>/looktime_pro.git` when adding the remote.

## Local development

You can continue working on the project locally or through Lovable. The stack remains unchanged (Vite + React + TypeScript + Tailwind + shadcn-ui).

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run a production build
npm run build
```

## Exporting Supabase data

The project includes a helper script for exporting all Supabase tables to both JSON and CSV files. Set the `SUPABASE_SERVICE_ROLE_KEY` (and optionally `SUPABASE_URL`) environment variables, then run:

```bash
npm run export:supabase
```

The command will create a timestamped snapshot under `data-export/` with per-table files and a `summary.json` manifest.
