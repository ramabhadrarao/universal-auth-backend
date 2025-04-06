# Secure User Management System 🔐

A robust backend implementation for a secure user management system with role-based and attribute-based access control (RBAC/ABAC).

## 🌟 Features

### Authentication & Security
- 🔑 JWT-based authentication with HTTP-only cookies
- 🔒 Secure password hashing using bcrypt
- 🛡️ Protection against common web vulnerabilities
- 📧 Email verification and password reset functionality

### Access Control
- 🔐 Role-Based Access Control (RBAC)
- 🔍 Attribute-Based Access Control (ABAC)
- 🚦 Granular permission management
- 👥 User role and permission assignments

### System Capabilities
- 👤 User registration and profile management
- 📊 User statistics and management
- 🔐 Role and permission management
- 🌐 RESTful API architecture

## 🚀 Installation

### Prerequisites
- Node.js (v14 or later)
- MongoDB

### Setup Steps
1. Clone the repository
```bash
git clone https://github.com/yourusername/secure-user-management.git
cd secure-user-management/backend
```

2. Install dependencies
```bash
npm install
```

3. Create environment configuration
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`
```
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/secure-user-management

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Secure User Management

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

5. Seed the database
```bash
node utils/seeder.js -i
```

6. Start the development server
```bash
npm run dev
```

## 🔐 Security Features

- JWT Authentication
- Password Hashing
- CORS Protection
- XSS Prevention
- Rate Limiting
- HTTP Parameter Pollution Protection
- Secure HTTP Headers
- MongoDB Query Sanitization
- Input Validation

## 🗂️ API Endpoints

### Authentication Routes
- `POST /api/v1/auth/register`: Register a new user
- `POST /api/v1/auth/login`: User login
- `GET /api/v1/auth/logout`: User logout
- `GET /api/v1/auth/me`: Get current user details
- `PUT /api/v1/auth/updatedetails`: Update user details
- `PUT /api/v1/auth/updatepassword`: Update password
- `POST /api/v1/auth/forgotpassword`: Initiate password reset
- `PUT /api/v1/auth/resetpassword/:resettoken`: Reset password
- `GET /api/v1/auth/verifyemail/:verificationtoken`: Verify email

### User Management Routes
- `GET /api/v1/users`: Get all users
- `GET /api/v1/users/:id`: Get single user
- `POST /api/v1/users`: Create user
- `PUT /api/v1/users/:id`: Update user
- `DELETE /api/v1/users/:id`: Delete user
- `GET /api/v1/users/stats`: Get user statistics

### Role Management Routes
- `GET /api/v1/roles`: Get all roles
- `POST /api/v1/roles`: Create role
- `PUT /api/v1/roles/:id`: Update role
- `DELETE /api/v1/roles/:id`: Delete role

### Permission Management Routes
- `GET /api/v1/permissions`: Get all permissions
- `POST /api/v1/permissions`: Create permission
- `PUT /api/v1/permissions/:id`: Update permission
- `DELETE /api/v1/permissions/:id`: Delete permission

## 💻 Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Bcrypt
- Nodemailer

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🛡️ Security

If you discover a security vulnerability, please send an email to security@example.com. All security vulnerabilities will be promptly addressed.

## 📧 Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/secure-user-management](https://github.com/yourusername/secure-user-management)
