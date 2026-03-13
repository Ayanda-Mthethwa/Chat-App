# ChatSystem — Real-Time Messaging Platform

![Angular](https://img.shields.io/badge/Angular_18-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![.NET](https://img.shields.io/badge/.NET_8-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![SignalR](https://img.shields.io/badge/SignalR-512BD4?style=for-the-badge&logo=microsoft&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

A production-ready, full-stack real-time chat platform built with Angular 18 and ASP.NET Core 8. Features persistent 1-on-1 messaging, live presence tracking, typing indicators, WhatsApp-style message read receipts, WebRTC video calling, and a dedicated admin dashboard with user management.

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
- [Role-Based Access](#role-based-access)

---

## Features

### Messaging
- **Real-time 1-on-1 chat** via SignalR WebSocket groups — no polling
- **Persistent message history** stored in MySQL, loaded on conversation open
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
│         Angular 18 Frontend         │      │         ASP.NET Core 8 Backend        │
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
                                                   ┌────────▼────────┐
                                                   │  MySQL Database  │
                                                   │  (EF Core ORM)  │
                                                   └─────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18, TypeScript, Angular Signals |
| Styling | Custom CSS, Google Material Symbols |
| Real-time | ASP.NET Core SignalR, `@microsoft/signalr` |
| Backend | ASP.NET Core 8 Web API |
| Auth | JWT Bearer Tokens, BCrypt.Net |
| ORM | Entity Framework Core 8 |
| Database | MySQL 8 (via Pomelo EF provider) |
| Video | WebRTC (browser native API) |

---

## Project Structure

```
Chat-App/
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
    └── src/app/
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
        │       └── toast.service.ts   # In-app notifications
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

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org) and npm
- [MySQL 8](https://dev.mysql.com/downloads/)
- Angular CLI: `npm install -g @angular/cli`

---

### 1. Database

Create the database in MySQL:

```sql
CREATE DATABASE chat_db;
```

---

### 2. Backend

```bash
cd backend/ChatSystem.API
```

Update `appsettings.json` with your MySQL credentials and a strong JWT key (see [Environment Configuration](#environment-configuration)).

```bash
dotnet ef database update   # Apply EF Core migrations
dotnet run                  # Starts on http://localhost:5062
```

Swagger UI is available at `http://localhost:5062/swagger` in development.

---

### 3. Frontend

```bash
cd frontend
npm install
ng serve                    # Starts on http://localhost:4200
```

---

## Environment Configuration

**`backend/ChatSystem.API/appsettings.json`**

```json
{
  "TokenKey": "replace_with_a_random_32_plus_character_secret",
  "ConnectionStrings": {
    "DefaultConnection": "server=localhost;port=3306;database=chat_db;user=YOUR_USER;password=YOUR_PASSWORD"
  }
}
```

> **Security note:** Never commit real credentials or your `TokenKey` to source control. Use environment variables or a secrets manager in production.

---

## Role-Based Access

| Role | Permissions |
|------|-------------|
| `Member` | Register, login, chat with other users, video call |
| `Admin` | All member permissions + view all users, delete non-admin users, monitor any conversation thread |

Role is assigned at registration and encoded in the JWT. The `[Authorize(Roles = "Admin")]` attribute on protected endpoints enforces this server-side. Angular route guards enforce it client-side.
