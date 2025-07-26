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

## License

MIT License - see LICENSE file for details
