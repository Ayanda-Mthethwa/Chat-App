# ChatSystem — Real-Time Messaging Platform

![Angular](https://img.shields.io/badge/Angular_21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![.NET](https://img.shields.io/badge/.NET_9-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![SignalR](https://img.shields.io/badge/SignalR-512BD4?style=for-the-badge&logo=microsoft&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

A production-ready, full-stack real-time chat platform built with Angular 21 and ASP.NET Core 9. Features persistent 1-on-1 messaging, live presence tracking, typing indicators, WhatsApp-style message read receipts, WebRTC video calling, and a dedicated admin dashboard with user management.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [SignalR Hubs](#signalr-hubs)
- [Setup & Installation](#setup--installation)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Role-Based Access](#role-based-access)

---

## Features

### Messaging
- **Real-time 1-on-1 chat** via SignalR WebSocket groups — no polling
- **Persistent message history** stored in PostgreSQL, loaded on conversation open
- **WhatsApp-style read receipts** — single tick (sent), double blue tick (read)
- **Typing indicators** — live "typing..." status while the other user composes
- **Date separators** — messages grouped by day with labeled dividers

### Presence
- **Live online/offline status** — updates instantly across all connected clients
- **Last seen** timestamp persisted to the database on disconnect
- **Multi-tab support** — user only goes offline when all tabs/devices disconnect

### Video Calling
- **1-on-1 WebRTC video calls** initiated from within any conversation
- **Incoming call modal** with Accept / Decline controls
- **In-call overlay** with local/remote video streams and end-call button

### Admin Dashboard
- **User list** with real-time online status indicators
- **Delete user** with a styled confirmation modal (admin-protected, cannot self-delete another admin)
- **Full message monitoring** — admins can open any conversation thread
- **Role-gated routes** — admin pages are inaccessible to regular members

### Authentication
- **JWT-based auth** — tokens signed server-side, attached automatically via `JwtInterceptor`
- **BCrypt password hashing** — no plaintext passwords stored
- **Route guards** — unauthenticated users are redirected to login; role mismatches are blocked

---

## Architecture

```
┌─────────────────────────────────────┐      ┌──────────────────────────────────────┐
│         Angular 21 Frontend         │      │        ASP.NET Core 9 Backend         │
│                                     │      │                                      │
│  ┌─────────┐  ┌──────────────────┐  │      │  ┌──────────────┐  ┌─────────────┐  │
│  │  Auth   │  │ JWT Interceptor  │  │ HTTP │  │  /api/account│  │ /api/admin  │  │
│  │ Service │  │  (auto-attach)   │──┼──────┼─▶│  register    │  │  users      │  │
│  └─────────┘  └──────────────────┘  │      │  │  login       │  │  users/{id} │  │
│                                     │      │  └──────────────┘  └─────────────┘  │
│  ┌──────────────┐  ┌─────────────┐  │      │                                      │
│  │ Chat Service │  │  Presence   │  │  WS  │  ┌─────────────┐  ┌─────────────┐  │
│  │ (ChatHub)    │  │  Service    │──┼──────┼─▶│  ChatHub    │  │PresenceHub  │  │
│  └──────────────┘  │(PresenceHub)│  │      │  │ /hubs/chat  │  │/hubs/       │  │
│                    └─────────────┘  │      │  └──────────────┘  │ presence   │  │
│                                     │      │                     └─────────────┘  │
└─────────────────────────────────────┘      └──────────────┬───────────────────────┘
                                                            │
                                                 ┌──────────▼──────────┐
                                                 │  PostgreSQL Database  │
                                                 │    (EF Core ORM)     │
                                                 └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21, TypeScript, Angular Signals |
| Styling | Custom CSS, Google Material Symbols |
| Real-time | ASP.NET Core SignalR, `@microsoft/signalr` |
| Backend | ASP.NET Core 9 Web API |
| Auth | JWT Bearer Tokens, BCrypt.Net |
| ORM | Entity Framework Core 9 |
| Database | PostgreSQL (via Npgsql EF provider) |
| Video | WebRTC (browser native API) |
| Deployment | Render (backend + frontend + database) |

---

## Project Structure

```
Chat-App/
├── Dockerfile                          # Multi-stage .NET 9 Docker build
├── render.yaml                         # Render Blueprint (API + PostgreSQL)
├── backend/
│   └── ChatSystem.API/
│       ├── Controllers/
│       │   ├── AccountController.cs    # Register & Login endpoints
│       │   ├── AdminController.cs      # User management (Admin-only)
│       │   └── UsersController.cs      # General user data
│       ├── Hubs/
│       │   ├── ChatHub.cs              # Private messaging, read receipts
│       │   └── PresenceHub.cs          # Online status, typing, WebRTC signals
│       ├── Models/
│       │   ├── User.cs
│       │   ├── Message.cs
│       │   ├── Conversation.cs
│       │   └── Participant.cs
│       ├── Dtos/
│       │   ├── LoginDto.cs
│       │   └── RegisterDto.cs
│       ├── Data/
│       │   └── ApplicationDbContext.cs
│       ├── Services/
│       │   └── TokenService.cs         # JWT generation
│       ├── appsettings.json
│       └── Program.cs                  # Middleware pipeline, DI registration
│
└── frontend/
    └── src/
        ├── environments/
        │   ├── environment.ts           # Development config
        │   └── environment.production.ts# Production config (API URL injected at build)
        └── app/
            ├── core/
            │   ├── guards/
            │   │   └── auth.guard.ts       # Route protection
            │   ├── interceptors/
            │   │   └── jwt.interceptor.ts  # Automatic token attachment
            │   ├── models/
            │   │   ├── user.model.ts
            │   │   └── chat.model.ts
            │   └── services/
            │       ├── auth.service.ts     # Login, register, current user signal
            │       ├── chat.service.ts     # ChatHub connection & message signals
            │       ├── presence.service.ts # PresenceHub, online users, typing
            │       ├── admin.service.ts    # Admin API calls
            │       └── toast.service.ts    # In-app notifications
            ├── features/
            │   ├── auth/
            │   │   ├── login/
            │   │   └── register/
            │   ├── chat/
            │   │   └── chat-window/        # Main messaging UI
            │   ├── admin/
            │   │   └── admin-dashboard/    # Admin panel
            │   └── settings/               # User settings page
            └── shared/
                └── toast/                  # Reusable toast notification component
```

---

## API Reference

### Auth — `/api/account`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/account/register` | None | Create a new user account |
| `POST` | `/api/account/login` | None | Authenticate and receive a JWT |

**Register body:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "Secret123!",
  "role": "Member"
}
```

**Login response:**
```json
{
  "username": "john",
  "role": "Member",
  "token": "<signed_jwt>"
}
```

---

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/users` | Admin JWT | List all users (no password hashes) |
| `DELETE` | `/api/admin/users/{id}` | Admin JWT | Delete a user (cannot delete admins) |

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users` | JWT | List all users (for chat user list) |

---

## SignalR Hubs

### `ChatHub` — `/hubs/chat`

Connected with query param `?user=<otherUsername>`. Token passed via `access_token` query param (standard SignalR pattern).

| Event (Server → Client) | Payload | Description |
|---|---|---|
| `ReceiveMessageThread` | `Message[]` | Full history on connect |
| `NewMessage` | `Message` | New incoming message |
| `MessagesRead` | `{ reader, dateRead }` | Recipient opened the chat — mark ticks blue |

| Method (Client → Server) | Args | Description |
|---|---|---|
| `SendMessage` | `recipientUsername, content` | Send a message |

**Read receipt logic:** When a user opens a conversation, all unread messages from the other party are immediately marked as read in the database and a `MessagesRead` event is broadcast to the group. If the recipient is already in the group at send time, `DateRead` is set immediately.

---

### `PresenceHub` — `/hubs/presence`

Global hub — connected for the lifetime of the user's session.

| Event (Server → Client) | Payload | Description |
|---|---|---|
| `GetOnlineUsers` | `{ id, username }[]` | Current online users on connect |
| `UserIsOnline` | `{ id, username }` | A user came online |
| `UserIsOffline` | `userId (string)` | A user went offline |
| `UserIsTyping` | `senderUsername` | Typing indicator start |
| `UserStoppedTyping` | `senderUsername` | Typing indicator stop |
| `NewSignal` | `sender, signalData` | WebRTC signaling payload |

| Method (Client → Server) | Args | Description |
|---|---|---|
| `UserTyping` | `toUsername` | Notify recipient typing started |
| `UserStoppedTyping` | `toUsername` | Notify recipient typing stopped |
| `SendSignal` | `toUsername, signalData` | Forward WebRTC offer/answer/ICE |

**Multi-tab handling:** The hub tracks a `ConcurrentDictionary<username, List<connectionId>>`. A user is only broadcast as offline when their last connection closes.

---

## Setup & Installation

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9)
- [Node.js 18+](https://nodejs.org) and npm
- [PostgreSQL](https://www.postgresql.org/download/)
- Angular CLI: `npm install -g @angular/cli`

---

### 1. Database

Create the database in PostgreSQL (tables are auto-created on first run):

```sql
CREATE DATABASE chat_db;
```

---

### 2. Backend

```bash
cd backend/ChatSystem.API
```

Update `appsettings.json` with your PostgreSQL credentials (see [Environment Configuration](#environment-configuration)).

```bash
dotnet restore
dotnet run        # Starts on http://localhost:5062
```

Tables are created automatically via `EnsureCreated()` on first startup. Swagger UI is available at `http://localhost:5062/swagger` in development.

---

### 3. Frontend

```bash
cd frontend
npm install
ng serve          # Starts on http://localhost:4200
```

---

## Environment Configuration

**`backend/ChatSystem.API/appsettings.json`**

```json
{
  "TokenKey": "replace_with_a_random_32_plus_character_secret",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=chat_db;Username=postgres;Password=YOUR_PASSWORD"
  },
  "AllowedOrigins": "http://localhost:4200"
}
```

> **Security note:** Never commit real credentials or your `TokenKey` to source control. Use environment variables in production.

---

## Deployment

The app is configured to deploy to [Render](https://render.com) using the included `render.yaml` Blueprint.

### Services

| Service | Type | URL |
|---|---|---|
| Backend API | Docker Web Service | `https://chat-app-api-q1db.onrender.com` |
| Frontend | Static Site | deployed separately |
| Database | Managed PostgreSQL | auto-connected via Blueprint |

### Steps

1. Push to GitHub
2. Render → **New** → **Blueprint** → connect your repo
3. Set env vars: `TokenKey`, `AllowedOrigins` (backend) and `API_URL` (frontend)
4. Create the frontend as a **Static Site** manually with:
   - **Build Command:** `cd frontend && npm install && sed -i "s|__API_URL__|$API_URL|g" src/environments/environment.production.ts && NODE_OPTIONS=--max-old-space-size=1024 npm run build`
   - **Publish Directory:** `frontend/dist/frontend/browser`

> The free tier backend spins down after 15 minutes of inactivity — the first request after sleep takes ~30 seconds to wake up.

---

## Role-Based Access

| Role | Permissions |
|------|-------------|
| `Member` | Register, login, chat with other users, video call |
| `Admin` | All member permissions + view all users, delete non-admin users, monitor any conversation thread |

Role is assigned at registration and encoded in the JWT. The `[Authorize(Roles = "Admin")]` attribute on protected endpoints enforces this server-side. Angular route guards enforce it client-side.
