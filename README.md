# Employee Management System

A comprehensive employee management system with advanced administrative controls and user-friendly interfaces for tracking attendance, requesting leave, and managing employee data.

## 🚀 Features

### Authentication & Security
- Secure user authentication with Passport.js
- Role-based access control (Admin/Employee)
- Device-based login tracking and blocking
- Session management with PostgreSQL storage
- Unblock request system for blocked devices

### Attendance Management
- GPS-based location tracking for clock in/out
- Geofencing validation for work locations
- Real-time attendance monitoring
- Comprehensive attendance reports and statistics
- Work location assignment and management

### Leave Management
- Multiple leave type support (Annual, Sick, Personal, etc.)
- Leave balance tracking by year
- Leave request workflow with approval system
- Manager approval/rejection with comments
- Advanced filtering and reporting capabilities

### User Management
- Employee profile management
- Auto-generated employee IDs
- User role assignment
- Location history tracking
- Device management and monitoring

### Admin Dashboard
- User administration panel
- Attendance overview and statistics
- Leave request management
- Work location configuration
- Device and security monitoring

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for client-side routing
- **TanStack Query** for state management and API calls
- **Tailwind CSS** with **shadcn/ui** components
- **React Hook Form** with Zod validation
- **Framer Motion** for animations

### Backend
- **Express.js** with TypeScript
- **Passport.js** for authentication
- **PostgreSQL** database
- **Drizzle ORM** for database interactions
- **Express Session** with PostgreSQL store
- **Zod** for schema validation

### Development Tools
- **Vite** for fast development and building
- **TypeScript** for type safety
- **Drizzle Kit** for database migrations
- **ESBuild** for production builds

## 📦 Installation

### Prerequisites
- Node.js 20 or higher
- PostgreSQL database
- npm or yarn package manager

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/kalayanroy/sabir-project.git
   cd sabir-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/employee_management
   SESSION_SECRET=your-session-secret-key
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Push database schema
   npm run db:push
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production build
   npm run build
   npm start
   ```

## 🚀 Usage

### For Employees
1. **Login/Register** - Create account or login with credentials
2. **Clock In/Out** - Track attendance with location verification
3. **View Attendance** - Check your attendance history and statistics
4. **Request Leave** - Submit leave requests with leave type and dates
5. **Profile Management** - Update personal information and view employee details

### For Administrators
1. **User Management** - Add, edit, and manage employee accounts
2. **Attendance Monitoring** - View all employee attendance records
3. **Leave Management** - Approve/reject leave requests and manage leave types
4. **Location Management** - Configure work locations and geofencing
5. **Security Controls** - Monitor device access and handle unblock requests

## 📱 Key Functionalities

### Attendance System
- **GPS Verification**: Ensures employees are at designated work locations
- **Geofencing**: Configurable radius-based location validation
- **Real-time Tracking**: Live attendance status monitoring
- **Detailed Reports**: Comprehensive attendance analytics

### Leave Management
- **Flexible Leave Types**: Support for various leave categories
- **Balance Tracking**: Annual leave balance calculations
- **Approval Workflow**: Multi-level approval process
- **Calendar Integration**: Visual leave calendar view

### Security Features
- **Device Binding**: Associates user accounts with specific devices
- **Failed Login Protection**: Automatic device blocking after failed attempts
- **Unblock Requests**: Self-service unblock request system
- **Session Security**: Secure session management with PostgreSQL

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Attendance
- `POST /api/attendance/clock-in` - Clock in with location
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/records` - Get attendance records
- `GET /api/attendance/stats` - Get attendance statistics

### Leave Management
- `GET /api/leave/types` - Get available leave types
- `POST /api/leave/requests` - Submit leave request
- `GET /api/leave/requests` - Get user leave requests
- `GET /api/leave/balances` - Get leave balances

### Admin Operations
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users/:id/role` - Update user role
- `GET /api/admin/attendance` - Get all attendance records
- `GET /api/admin/leave/requests` - Get all leave requests

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:
- **users** - User accounts and profiles
- **deviceAttempts** - Device login tracking and blocking
- **attendance** - Employee attendance records
- **workLocations** - Configured work locations
- **leaveTypes** - Available leave categories
- **leaveRequests** - Leave request records
- **leaveBalances** - Employee leave balances

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Session encryption key | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## 🚦 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Application pages
│   └── lib/            # Utility functions
├── server/             # Express backend
│   ├── routes.ts       # API route definitions
│   ├── auth.ts         # Authentication logic
│   ├── storage.ts      # Database operations
│   └── services/       # Business logic services
├── shared/             # Shared TypeScript types
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions, please open an issue on the GitHub repository or contact the development team.

---

**Built with ❤️ using modern web technologies for efficient employee management.**
