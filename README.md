# 💬 Real-Time Chat & Admin System

![Angular](https://img.shields.io/badge/angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)
![.Net](https://img.shields.io/badge/dotnet-%23512BD4.svg?style=for-the-badge&logo=.net&logoColor=white)
![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)
![SignalR](https://img.shields.io/badge/SignalR-blueviolet?style=for-the-badge)

A robust, full-stack communication platform featuring real-time messaging, user presence tracking, and a dedicated administrative suite.

---

## 🏗 System Architecture

The application follows a decoupled architecture, ensuring a clean separation between the high-performance .NET 8 backend and the reactive Angular 18 frontend.



### 📂 Directory Structure

#### **Frontend (`src/app/`)**
- **`core/`** - Global Singletons (Auth, Presence, SignalR services), Guards, and JWT Interceptors.
- **`shared/`** - Reusable UI components like loaders, status badges, and custom pipes.
- **`features/`** - Feature-specific logic (Admin Dashboard, Chat Window, Login/Register).

#### **Backend (`ChatSystem.API/`)**
- **`Hubs/`** - SignalR Hubs managing real-time WebSocket traffic.
- **`Controllers/`** - REST API endpoints with Role-Based Access Control (RBAC).
- **`Models/`** - Data schemas for MySQL/Entity Framework.

---

## 🚀 Core Features

- **⚡ Real-Time Chat**: Instant 1-on-1 messaging using SignalR groups for private "chat rooms."
- **🟢 Presence Tracking**: Live "Online/Offline" status updates powered by `PresenceHub`.
- **🛡️ Admin Dashboard**: Secure management of users, roles, and system status.
- **🔑 Secure Auth**: JWT-based authentication with a `JwtInterceptor` for automatic token attachment.
- **🗄️ Persistence**: Full message history and user profiles stored in a MySQL database.

---

## 🛠 Setup & Installation

### 1. Backend (.NET 8)
1. Navigate to the API folder: `cd backend/ChatSystem.API`
2. Update the connection string in `appsettings.json` with your MySQL credentials.
3. Run migrations and start the server:
   ```bash
   dotnet ef database update
   dotnet run
