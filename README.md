# Kanban Board System

A collaborative, real-time Kanban board built with **React + Vite** and **Supabase** (PostgreSQL + Auth + Realtime). Designed to synchronize daily workflows between interns and management in a startup environment.

---

## Features

- **Authentication** - Secure sign-up, sign-in, forgot password, and change password flows via Supabase Auth
- **Role-Based Access Control** - Members see only their own Intern Board; Admins have access to both the Intern Board and Admin Oversight panel
- **Kanban Board** - Drag-and-drop task management across To Do, In Progress, and Done columns
- **Real-Time Sync** - Live task and column updates via Supabase Realtime subscriptions
- **Share Board** - Generate secure, shareable guest links with **View Only** or **Collaborator** permissions
- **Guest Access** - External users can access a shared board via a token link without needing an account
- **Admin Oversight Panel** - Monitor all team tasks, assign new tickets, and view active members
- **Custom Branding** - Organization-specific logo and branding

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| Styling | Vanilla CSS (custom design system) |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime (Postgres Changes) |
| Routing | React Router DOM v6 |

---

## Project Structure

```
kanban-board-system/
├── public/
│   └── logo.png               # Application logo
├── src/
│   ├── components/
│   │   ├── auth/              # SignIn, CreateAccount, ForgotPassword, ChangePassword, SignOut
│   │   ├── board/             # Board, Column, Task components
│   │   ├── collaboration/     # ShareBoardModal, GuestAccess
│   │   ├── dashboard/         # Dashboard (Intern Board + Admin Oversight tabs)
│   │   └── landing/           # LandingPage
│   ├── lib/
│   │   └── supabaseClient.js  # Supabase client initialization
│   ├── utils/
│   │   └── permissions.js     # Role resolution and permission guards
│   ├── App.jsx                # Route definitions
│   ├── index.css              # Global design system and styles
│   └── main.jsx               # Application entry point
├── supabase/
│   └── schema.sql             # Full database schema + RLS policies
├── .env                       # Environment variables (not committed)
├── index.html
├── package.json
└── vite.config.js
```

---

## Setup and Installation

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone the repository
```bash
git clone https://github.com/Jassim3nidad/kanban.git
cd kanban/kanban-board-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `kanban-board-system/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set up the database

In your Supabase project, open the **SQL Editor** and run the full contents of:
```
supabase/schema.sql
```

> Important: Also run the Administrator Bypass Policies block at the bottom of the schema to ensure admin users have full board access.

### 5. Run the development server
```bash
npm run dev
```

The app will be available at **http://localhost:5173/**

---

## User Roles

| Role | Capabilities |
|---|---|
| **Member** | Access their own Intern Board, manage their tasks |
| **Admin** | Access all boards, Admin Oversight panel, assign tasks to team members |
| **Guest (View Only)** | View board columns and tasks - no write access |
| **Guest (Collaborator)** | Full task CRUD - create, edit, delete, and move tasks |

### Registering as Administrator

When creating an account, selecting the **Administrator** role requires an **Admin Access Code**. Contact your organization administrator for this code.

---

## Board Sharing

Logged-in Owners and Editors can share the board:

1. Click **Share Board** in the workspace banner
2. Select a permission level:
   - **View Only** - guest can read but not modify
   - **Collaborator** - guest has full editing rights
3. Click **Generate Link** and share the URL
4. Guest opens the `/guest/:token` route - no login required

---

## Database Schema

Key tables:

| Table | Description |
|---|---|
| `users` | Extended auth profiles with `role` field |
| `boards` | Kanban boards with owner reference |
| `board_members` | Maps users to boards with viewer/editor/owner role |
| `columns` | Board columns with position ordering |
| `tasks` | Tasks linked to boards and columns |
| `shared_links` | Guest access tokens with permission type and expiry |

All tables have Row-Level Security (RLS) policies enforced.

---

## Build for Production

```bash
npm run build
```

Output is generated in the `dist/` folder.

---

## License

This project is intended for internal organizational use by StartupLab.
