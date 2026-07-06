# Spheral — Phase 1 Frontend

A Facebook-style social networking app built with **React + Vite + Tailwind CSS**.

## Quick Start

```bash
cd client
npm install
npm run dev
```

Then open **http://localhost:3000**

---

## Project Structure

```
client/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx                     # Router + providers
│   ├── main.jsx                    # Entry point
│   ├── index.css                   # Global styles (Tailwind)
│   ├── context/
│   │   └── AppContext.jsx          # Global state (useReducer)
│   ├── data/
│   │   └── mockData.js             # All Phase 1 mock data
│   ├── utils/
│   │   └── helpers.js              # Date, number, notif helpers
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── LeftSidebar.jsx
│   │   │   ├── RightSidebar.jsx
│   │   │   ├── MainLayout.jsx
│   │   │   └── NotificationsDropdown.jsx
│   │   ├── feed/
│   │   │   ├── Post.jsx
│   │   │   ├── CommentSection.jsx
│   │   │   ├── CreatePostBox.jsx
│   │   │   └── Stories.jsx
│   │   └── ui/
│   │       ├── Avatar.jsx
│   │       ├── LoadingSpinner.jsx
│   │       └── Toast.jsx
│   └── pages/
│       ├── LoginPage.jsx
│       ├── SignupPage.jsx
│       ├── HomePage.jsx
│       ├── ProfilePage.jsx
│       ├── FriendsPage.jsx
│       ├── GroupsPage.jsx
│       ├── GroupDetailPage.jsx
│       ├── NotificationsPage.jsx
│       ├── SearchPage.jsx
│       ├── SettingsPage.jsx
│       └── NotFoundPage.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Pages

| Route | Page |
|-------|------|
| `/` | News Feed (stories + posts) |
| `/login` | Login |
| `/signup` | Multi-step signup |
| `/profile/:userId` | Profile (posts, photos, friends, about) |
| `/friends` | Friend requests, suggestions, all friends |
| `/groups` | Groups list (grid/list view) |
| `/groups/:groupId` | Group detail |
| `/notifications` | All notifications |
| `/search?q=...` | Search results |
| `/settings` | Account settings |

---

## Phase Roadmap

- ✅ **Phase 1** — Frontend with mock data (current)
- ⬜ **Phase 2** — Express + MongoDB backend (next)
- ⬜ **Phase 3** — Full integration
