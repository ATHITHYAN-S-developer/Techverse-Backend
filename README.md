# 🌌 TechVerse — Institutional Educational Technology Backend API

**Velalar College of Engineering and Technology (Autonomous), Erode, Tamil Nadu**  
Tagline: *Explore • Learn • Build*

---

## 🏛️ System Architecture

TechVerse Backend is a high-performance RESTful API built with **Node.js**, **Express.js**, **MongoDB (Mongoose)**, **JWT Authentication**, and **Role-Based Access Control (RBAC)**.

```text
                    ┌────────────────────────┐
                    │  React 19 / Vite App   │
                    │   (Frontend Client)    │
                    └───────────┬────────────┘
                                │ HTTP / JSON
                    ┌───────────▼────────────┐
                    │    Express REST API    │
                    │      Port: 5000        │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
 ┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
 │  JWT Auth   │         │    RBAC     │         │ Department  │
 │ Middleware  │         │ (student /  │         │  Isolation  │
 │             │         │ teacher /   │         │ (for staff) │
 │             │         │   admin)    │         │             │
 └─────────────┘         └─────────────┘         └─────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      Controllers       │
                    │  Auth / Users / Depts  │
                    │ Tests / Courses / Certs│
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    Services Layer      │
                    │ Points, Streaks, Certs │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    Mongoose Models     │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │     MongoDB Database   │
                    │       'techverse'      │
                    └────────────────────────┘
```

---

## ⚡ Key Architectural Directives

1. **Unified User Authentication**:
   - Single `User` model with `role: "student" | "teacher" | "admin"`.
   - JWT payload contains `{ userId, role }`.
   - **Password Security Directive**: Passwords stored directly as plain text (`password: String`) and validated via `enteredPassword === user.password`.
2. **Teacher Department Isolation**:
   - `departmentMiddleware` automatically checks that teachers can only create, edit, and delete academic resources/announcements for their assigned `departmentId`.
3. **Anti-Cheat Test Delivery**:
   - `GET /api/tests/today` and `GET /api/tests/:id` dynamically strip `correctAnswer` and `explanation` from responses sent to students.
   - Scoring, grading, points awarding (+10 points, +50 streak bonuses), and streak updates are computed entirely on the server upon `POST /api/tests/:id/submit`.
4. **Verifiable Certificates**:
   - Publicly verifiable through unique alphanumeric verification codes at `/api/certificates/verify/:code`.
5. **Recharts-Compatible Analytics**:
   - Structured JSON payloads for direct consumption by Recharts graphs and admin dashboards.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **MongoDB** running locally (`mongodb://127.0.0.1:27017/techverse`) or MongoDB Atlas URI

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/techverse
JWT_SECRET=vcet_techverse_secure_secret_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 4. Seed Default Database
Run the automated seed script to populate sample departments (CSE, AI&DS, IT, ECE, EEE, MECH, CIVIL), subjects, courses, daily tests, and test accounts:
```bash
npm run seed
```

### 5. Start the Development Server
```bash
npm run dev
```
The API will be available at `http://localhost:5000`.  
Health check endpoint: `http://localhost:5000/api/health`.

---

## 🔑 Default Seed Credentials

| Role | Identifier / Field | Value | Password | Department |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `username` | `admin` | `admin123` | System-wide |
| **Faculty / Teacher** | `staffId` | `VCET-FAC-CSE-104` | `faculty123` | Computer Science & Eng. |
| **Student** | `registerNumber` | `732924CSE001` | `student123` | Computer Science & Eng. |

---

## 📚 Complete REST API Reference

### 1. Authentication & Profile (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Log in as student, teacher, or admin. Returns JWT token & safe user profile. |
| `GET` | `/api/auth/me` | Protected | Fetch current logged-in user details. |
| `PUT` | `/api/auth/profile` | Protected | Update user profile info (name, profileImage). |
| `POST` | `/api/auth/change-password` | Protected | Update user password. |

### 2. Users, Leaderboard & Gamification (`/api/users`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/leaderboard` | Public | Paginated student ranking by total points or streak count. |
| `GET` | `/api/users/points-history` | Protected (Student) | Paginated ledger of points earned by student. |
| `GET` | `/api/users/streak` | Protected (Student) | Fetch current streak, longest streak, and freezes. |

### 3. Academic Structure (`/api/departments`, `/api/classes`, `/api/subjects`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | Public | List all active departments with real-time student/resource stats. |
| `GET` | `/api/departments/:id` | Public | Get single department details. |
| `POST` | `/api/departments` | Admin | Create academic department. |
| `GET` | `/api/classes` | Public | Get classes filtered by department, year, semester. |
| `POST` | `/api/classes` | Admin | Create new class section. |
| `GET` | `/api/subjects` | Public | Get subjects filtered by department/semester. |
| `GET` | `/api/subjects/:id` | Public | Get single subject with assigned faculty and active resources. |
| `POST` | `/api/subjects` | Teacher, Admin | Create subject (Teacher restricted to own department). |

### 4. Department Resources (`/api/resources`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/resources` | Public | Filter resources by `departmentId`, `subjectId`, `classId`, `type`, `unit`, or search keyword. |
| `GET` | `/api/resources/:id` | Public | Get single resource details. |
| `POST` | `/api/resources` | Teacher, Admin | Upload/link notes, question banks, lab manuals. (Enforces teacher dept isolation). |
| `PUT` | `/api/resources/:id` | Teacher, Admin | Update resource metadata. |
| `DELETE` | `/api/resources/:id` | Teacher, Admin | Soft delete resource. |
| `POST` | `/api/resources/:id/download`| Public | Increment download metrics counter. |

### 5. Institutional Announcements (`/api/announcements`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | Public | List announcements with audience/dept filtering. |
| `POST` | `/api/announcements` | Teacher, Admin | Publish new announcement. |
| `PUT` | `/api/announcements/:id` | Teacher, Admin | Edit announcement. |
| `DELETE`| `/api/announcements/:id` | Teacher, Admin | Remove announcement. |

### 6. Self-Paced Courses & Modules (`/api/courses`, `/api/modules`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/courses` | Public | List published courses with user's active progress percentage. |
| `GET` | `/api/courses/:slug` | Public | Course details with ordered module list. |
| `POST` | `/api/courses/:id/enroll` | Student | Enroll in a course. |
| `POST` | `/api/courses/:id/complete-module` | Student | Mark module complete, calculate progress, award points, trigger certificate if 100%. |
| `GET` | `/api/courses/my/enrollments` | Student | List all enrolled courses for authenticated student. |
| `POST` | `/api/courses` | Teacher, Admin | Create new course. |
| `POST` | `/api/modules` | Teacher, Admin | Add module to course. |

### 7. Daily Practice Tests (`/api/tests`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tests/today` | Public | Today's test sanitized (**no correct answers sent**). |
| `GET` | `/api/tests/:id` | Public | Test details sanitized for students. |
| `POST` | `/api/tests/:id/submit` | Student | **Submit test**: Backend grades answers, computes score %, updates streak, awards points, records attempt, returns score and answer review. |
| `GET` | `/api/tests/my/attempts` | Student | History of test scores and attempts. |
| `POST` | `/api/tests` | Teacher, Admin | Create test with questions, options, answers, and explanations. |

### 8. Verifiable Certificates (`/api/certificates`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/certificates/my` | Student | List earned certificates. |
| `GET` | `/api/certificates/verify/:code` | Public | **Public Verification**: Returns student name, course name, grade, date, and validity without exposing private credentials. |
| `POST` | `/api/certificates/claim` | Student | Mint certificate for 100% completed course. |

### 9. Analytics & Visitor Insights (`/api/analytics`, `/api/visitors`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/overview` | Public | Aggregated system metrics & Recharts-ready test trends. |
| `GET` | `/api/analytics/student` | Student | Personal study statistics, score histories, completion rates. |
| `GET` | `/api/analytics/department/:id` | Teacher, Admin | Department download metrics and resource counts. |
| `POST` | `/api/visitors/track` | Public | Increment daily page view / category visit counter. |

### 10. Admin Management & Audit Logs (`/api/admin`, `/api/audit-logs`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Admin | Paginated roster of students/teachers/admins. |
| `POST` | `/api/admin/users` | Admin | Create user accounts with plain text passwords. |
| `PUT` | `/api/admin/users/:id/status` | Admin | Block / Unblock student or faculty access. |
| `PUT` | `/api/admin/users/:id/reset-password`| Admin | Reset user password. |
| `GET` | `/api/audit-logs` | Admin | Complete immutable audit log of administrative actions, logins, and certificate issuances. |
