# 📋 Kanban Board Fullstack

A modern, full-stack collaborative Kanban board application built with **React 19**, **TypeScript**, **Node.js (Express)**, and **PostgreSQL**, containerized with **Docker**.

![Project Preview](Image/Project%20Preview.png)

---

## ✨ Features

- 🔐 **Authentication & Authorization**: Secure User Registration and Login with bcrypt password hashing and JWT authentication.
- 📋 **Board Management**: Create, rename, view, and delete personal boards or collaborative team boards.
- 👥 **Team Collaboration**: Invite team members by email to work on boards together.
- 📑 **Columns & Tasks**:
  - Add, rename, and delete columns.
  - Create and edit tasks with title and detailed description.
  - **Drag and Drop**: Smooth drag-and-drop card reordering and cross-column movement using `@hello-pangea/dnd`.
  - Assign tasks to board members.
- 🏷️ **Custom Tags**: Create color-coded tags and attach multiple tags to tasks.
- 🔔 **In-App Notifications**: Real-time notifications for board invitations and task assignments.
- 🐳 **Dockerized**: Fully orchestrated with Docker Compose (PostgreSQL, Backend API, and Frontend).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Drag & Drop**: `@hello-pangea/dnd`
- **Routing**: `react-router-dom`
- **HTTP Client**: Axios with global session/auth interceptor

### Backend
- **Runtime**: Node.js + Express 5 + TypeScript
- **Authentication**: JSON Web Tokens (JWT) + Bcrypt
- **Database Client**: `pg` (Node-Postgres Pool with auto table initialization)

### Database & DevOps
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose

---

## 🚀 Getting Started

### Method 1: Run with Docker Compose (Recommended)

Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running:

```bash
# Clone the repository
git clone https://github.com/mindnonthiya/kanban-board-fullstack.git
cd kanban-board-fullstack

# Build and start all services (Database, Backend, and Frontend)
docker compose up -d --build
```

Access the services:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **PostgreSQL**: `localhost:5432`

To view logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

### Method 2: Manual Local Setup

#### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running on `localhost:5432`

#### 1. Setup Backend
```bash
cd server
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
npm install
npm run dev
```

#### 2. Setup Frontend
```bash
cd client
npm install
npm run dev
```

---

## 🔑 Environment Variables

### Backend (`server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `3000` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `your_password` |
| `DB_HOST` | Database host | `localhost` (or `db` in Docker) |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `kanban_db` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `your_secret_key` |

### Frontend (`client/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base API URL | `http://localhost:3000/api` |

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

### Boards
- `GET /api/boards` - List all boards accessible by the user
- `POST /api/boards` - Create a new board
- `GET /api/boards/:id` - Get board details
- `PUT /api/boards/:id` - Update board name
- `DELETE /api/boards/:id` - Delete board
- `GET /api/boards/:id/members` - List board members
- `POST /api/boards/:id/invite` - Invite a user by email

### Columns
- `GET /api/columns/:boardId` - Get columns of a board
- `POST /api/columns` - Create a new column
- `PUT /api/columns/:id` - Rename a column
- `DELETE /api/columns/:id` - Delete a column

### Tasks
- `GET /api/tasks/:boardId` - Get tasks for a board
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update title, description, or assignee
- `PUT /api/tasks/:id/move` - Move task to a new column or position
- `DELETE /api/tasks/:id` - Delete a task

### Tags
- `GET /api/tags/:boardId` - Get tags for a board
- `POST /api/tags` - Create a new tag
- `POST /api/tags/task` - Attach a tag to a task
- `DELETE /api/tags/task/:taskId/:tagId` - Remove tag from task

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
