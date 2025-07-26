# LiveCode

A modern web playground that allows you to run code in different programming languages directly in your browser.

## Features

- 🚀 **Multi-language support**: JavaScript, TypeScript, Python, Go
- 🎨 **Modern dark theme**: Easy on the eyes with professional styling
- ⚡ **Real-time execution**: Run code instantly with live output
- 🔧 **Monaco Editor**: VS Code-like editing experience
- 📱 **Responsive design**: Works on desktop and mobile devices

## Project Structure

This is a monorepo containing both frontend and backend applications:

```
├── frontend/           # React + TypeScript + Vite
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/            # Express + TypeScript server
│   ├── src/
│   └── package.json
└── package.json        # Root package.json with workspace scripts
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Yarn (v1.22 or higher)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd coderjam
```

2. Install all dependencies:
```bash
yarn install
```

### Development

To run both frontend and backend in development mode:

```bash
yarn dev
```

This will start:
- Frontend (Vite) dev server on `http://localhost:5173`  
- Backend server on `http://localhost:3001`
- **Access your app at `http://localhost:3001`** (backend proxies to frontend)

#### Why use the backend URL?
In development, the backend server proxies all non-API requests to the Vite dev server. This allows you to:
- 🔄 Use a single URL for both frontend and API
- 🚀 Keep Vite's fast HMR (Hot Module Replacement)
- 🔧 Test API integration seamlessly
- 📱 Avoid CORS issues

#### Run individually:

Frontend only:
```bash
yarn dev:frontend
```

Backend only:
```bash
yarn dev:backend
```

### Building for Production

Build both applications:
```bash
yarn build
```

Build individually:
```bash
yarn build:frontend
yarn build:backend
```

### Production Deployment

Start the production server:
```bash
yarn start
```

The backend will serve the built React app and API endpoints on the same port.

## Development Scripts

- `yarn dev` - Start both frontend and backend in development mode
- `yarn build` - Build both applications for production
- `yarn lint` - Run ESLint on both frontend and backend
- `yarn start` - Start production server
- `yarn type-check` - Run TypeScript type checking
- `yarn clean` - Clean build artifacts

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Monaco Editor** - Code editor
- **Pyodide** - Python runtime in browser

### Backend
- **Express** - Web server framework
- **TypeScript** - Type safety
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logging

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /*` - Serves React app (production only)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `yarn lint`
5. Submit a pull request

## License

MIT License - see LICENSE file for details
