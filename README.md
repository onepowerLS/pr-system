# 1PWR Purchase Request System

A web-based system for managing purchase requests at 1PWR Africa. Built with React, Firebase, and Material-UI.

## Features

- User authentication and role-based access control
- Create and manage purchase requests
- Track PR status and approvals
- View PR history and details
- Export data to spreadsheets

## Tech Stack

- React + TypeScript
- Firebase (Auth, Firestore)
- Material-UI
- Redux Toolkit
- React Router
- Vite

## Development Setup

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
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. Start the development server:
```bash
npm run dev
```

## Firebase Setup

1. Create a new Firebase project
2. Enable Email/Password authentication
3. Create a Firestore database
4. Set up Firestore security rules
5. Generate and download service account credentials

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Data Migration

The system includes scripts for migrating data from Google Sheets:

1. Place your Firebase service account credentials in `firebase-service-account.json`
2. Place your Google Sheets API credentials in `google-sheets-credentials.json`
3. Run the migration script:
```bash
node scripts/migrate-from-sheets.js
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT
