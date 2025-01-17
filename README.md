# 1PWR Procurement Requisition System

A comprehensive procurement requisition system built for 1PWR to manage purchase requests and orders.

## Features

### Core Features
- User authentication with role-based access control
- Purchase request creation and management
- Purchase order tracking
- Multi-organization support
- Document management
- Approval workflow

### Admin Features
- User management
- Reference data management
  - Departments
  - Currencies
  - Units of Measure (UOM)
  - Vendors
  - Project Categories
  - Expense Types
- Organization management

### Reference Data Management
- CRUD operations for all reference data types
- Code-based ID generation for currencies and UOM
- Duplicate prevention for codes
- Active/Inactive status tracking
- Organization-specific data filtering

## Technical Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- Redux for state management
- React Router for navigation

### Backend
- Firebase
  - Authentication
  - Firestore Database
  - Storage
  - Functions
- Express.js for API endpoints

### Development Tools
- Vite for development and building
- ESLint for code linting
- PostCSS for CSS processing

## Project Structure
```
src/
├── components/     # React components
│   ├── admin/     # Admin-specific components
│   ├── common/    # Shared components
│   ├── pr/        # PR-specific components
│   └── ui/        # UI components
├── config/        # Configuration files
├── hooks/         # Custom React hooks
├── lib/          # Utility libraries
├── scripts/      # Database scripts
├── services/     # API services
├── store/        # Redux store
├── styles/       # Global styles
└── types/        # TypeScript types
```

## Recent Updates
- Added reference data management with code-based IDs
- Implemented organization filtering for reference data
- Added validation to prevent duplicate codes
- Added success/error notifications
- Improved form validation
- Fixed ghost entry issues in reference data
- Added persistence for selected reference data type

## Getting Started

### Prerequisites
- Node.js >= 16
- npm >= 8
- Firebase project

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/pr-system.git
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` with your Firebase configuration.

4. Start the development server
```bash
npm run dev
```

## Contributing
1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License
Proprietary - All rights reserved
