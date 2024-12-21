# Purchase Request System

A modern web application for managing purchase requests built with React, Firebase, and Material-UI.

## Features

- User authentication and role-based access control
- Multi-step PR creation form with real-time validation
- Dashboard with PR status overview and quick actions
- Approval workflow management
- Real-time updates using Firebase
- Responsive design for desktop and mobile

## Tech Stack

- React 18 with TypeScript
- Vite for build tooling
- Firebase (Authentication, Firestore, Storage)
- Material-UI for components
- Redux Toolkit for state management
- React Router for navigation
- React Hook Form for form handling

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Firebase project with:
  - Authentication enabled (Email/Password)
  - Firestore database
  - Storage bucket

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pr-system.git
cd pr-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

- `/src`
  - `/components` - React components
    - `/auth` - Authentication components
    - `/common` - Shared components
    - `/dashboard` - Dashboard components
    - `/pr` - Purchase Request components
  - `/config` - Configuration files
  - `/hooks` - Custom React hooks
  - `/services` - Firebase services
  - `/store` - Redux store and slices
  - `/types` - TypeScript interfaces
  - `/utils` - Utility functions

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
