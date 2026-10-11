# Verdant Tracker

Build a responsive web app frontend called "Plant Care & Water-Saving Log" using React + Tailwind CSS. This is a sustainability-focused plant care tracker — the design should feel fresh, natural, and polished, since it will be shown live at an expo.



Color palette: primary green #4c7a3f, dark green #355c3a, cream/beige accent #fff3d6, soft off-white background. Rounded corners, soft shadows, generous whitespace. Use a nice icon set (lucide-react) for plants/water/leaf icons — no generic clipart look.



Build two screens:



1. Dashboard (Home)

- Top summary bar: total plants, plants needing water today, current eco-points, current watering streak — as 4 stat cards

- Grid of plant cards below: plant icon/illustration, name, species, location, status badge ("Needs Water" in warm orange / "Recently Watered" in green), next watering date, and a "Log Watering" button

- Populate with 6 realistic sample plants (varied species, some needing water, some not)



2. Plant Management

- Add/Edit Plant form (modal or side panel): name, species, location, watering frequency in days

- Search and filter bar (by name, species, location)

- List/grid of all plants with edit and delete (with confirmation) actions



Navigation: left sidebar (collapses to bottom tab bar on mobile) with Dashboard, Plants, Watering Log, Analytics, Leaderboard, Profile — only Dashboard and Plants need to be functional right now, the rest can be placeholder routes.



Use mock/local state data, structured cleanly so it's easy to swap in real API calls later. Add subtle hover/transition animations on cards and buttons.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/55def528-a3e4-4678-abe7-36e2c0f0c0a9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
