[![Unit Tests](https://github.com/guymor4/coderjam/actions/workflows/unit-tests.yaml/badge.svg?branch=main)](https://github.com/guymor4/coderjam/actions/workflows/unit-tests.yaml)

# CoderJam
A modern web playground that allows you to run code in different programming languages directly in your browser.
Every language runs in its own isolated wasm environment, ensuring security and performance.

## Supported languages
- **JavaScript** using QuickJS.
- **TypeScript** using Typescript transpiler and QuickJS.
- **Python**: using Pyodide.
- **Go**: using a custom Go runtime compiled to WebAssembly with a virtual filesystem and processes.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Yarn (v1.22 or higher)
- Docker and Docker Compose (for PostgreSQL database)

### Installation
1. Clone the repository:
```bash
git clone <your-repo-url>
cd coderjam
```

2. Start the PostgreSQL database:
```bash
docker-compose up -d
```

3. Install all dependencies:
```bash
yarn install
```

### Development
To run both frontend and backend in development mode:

1. Make sure PostgreSQL is running:
```bash
docker-compose up -d
```

2. Start the development servers:
```bash
yarn dev
```

This will start:
- PostgreSQL database on `localhost:5432`
- Frontend (Vite) dev server on `http://localhost:5173`  
- Backend server on `http://localhost:3001`
- **Access your app at `http://localhost:3001`** (backend proxies to frontend)

### Production
For production, we build frontend and backend into a single container and docker-compose.prod.yaml that manages it all.
```bash
# Build and start production server (+ PostgreSQL)
docker-compose -f docker-compose.prod.yaml up --build
```

## License

MIT License - see LICENSE file for details
