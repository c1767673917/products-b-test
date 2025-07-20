# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a product showcase application built with React + TypeScript + Vite. The main application is located in the `product-showcase/` directory and features:

- Modern React 19 with TypeScript
- Framer Motion animations with performance optimizations
- TanStack Query for data fetching and caching
- Zustand for state management
- Tailwind CSS + HeadlessUI for styling
- Comprehensive testing with Vitest and React Testing Library
- Advanced performance monitoring and virtual scrolling

The project includes data analysis tools for Feishu (Lark) API integration and product data processing scripts in Python.

## Common Development Commands

All commands should be run from the `product-showcase/` directory:

### Development
```bash
cd product-showcase
npm run dev                # Start development server (http://localhost:5173)
npm run build              # Build for production (TypeScript + Vite)
npm run preview            # Preview production build
```

### Testing
```bash
npm run test               # Run tests in watch mode
npm run test:run           # Run tests once
npm run test:ui            # Run tests with UI interface
npm run test:coverage      # Run tests with coverage report
```

### Code Quality
```bash
npm run lint               # Run ESLint
```

### Data Management
```bash
npm run fix-keys           # Fix duplicate product keys
npm run validate-keys      # Validate product data integrity
npm run process-data       # Process raw product data
npm run backup-data        # Backup current product data
npm run check-duplicates   # Check for duplicate product IDs
```

## Architecture Overview

### State Management
- **Zustand Store** (`src/stores/productStore.ts`): Main application state with persistence for user preferences
- **TanStack Query** (`src/services/queryClient.ts`): Server state management and caching
- **Backend API Service** (`src/services/backendApiService.ts`): Product data operations via REST API

### Key Components Structure
- **Pages**: Route-level components in `src/pages/`
  - `ProductList`: Main product grid with filtering
  - `ProductListWithQuery`: TanStack Query implementation
  - `ProductDetail`: Individual product view
  - `ApiDemo`: API integration demonstration
  - `PerformanceDemo`: Performance testing utilities

- **UI Components** (`src/components/ui/`): Reusable components with comprehensive testing
  - `VirtualGrid`: High-performance virtual scrolling
  - `Pagination`: Advanced pagination with URL sync
  - `PerformanceMonitor`: Real-time performance tracking
  - `AnimationSettings`: User animation preferences

- **Product Components** (`src/components/product/`): Product-specific components
  - `ProductCard`: Optimized product display with lazy loading
  - `ImageGallery`: Multi-image viewer with preloading
  - `LazyImage`: Performance-optimized image component

### Data Flow
1. All product data fetched from backend API via HTTP requests
2. BackendApiService handles API communication and response processing
3. ProductStore manages UI state and user preferences
4. TanStack Query handles API calls and caching
5. Components consume data through custom hooks

### Performance Features
- Virtual scrolling for large product lists
- Image lazy loading with intersection observer
- Code splitting with manual chunks in Vite config
- Animation performance monitoring and user preferences
- Server-side filtering and pagination

### Testing Strategy
- Unit tests for core utilities and components
- Integration tests for performance scenarios
- Visual testing for UI components
- Coverage reporting with Vitest

## Working with This Codebase

### Adding New Features
1. Follow existing component patterns in `src/components/`
2. Use TypeScript interfaces from `src/types/`
3. Implement tests in `__tests__/` directories
4. Consider performance implications for large datasets

### Data Structure
Products follow the `Product` interface in `src/types/product.ts` with:
- Hierarchical categories (primary/secondary)
- Multi-image support (front/back/label/package/gift)
- Price with discount support
- Origin location data
- Platform and specification details

### State Updates
- Use ProductStore actions for UI state changes
- All data operations performed via backend API
- Maintain URL synchronization for shareable states
- Server handles filtering, search, and pagination operations

### Image Management
- Images served from backend MinIO storage with proper CDN integration
- Use LazyImage component for performance
- Implement proper fallbacks for missing images
- Consider image optimization for production

## Important Notes

- The application handles large datasets (500+ products) with performance optimizations
- Animation preferences are user-configurable with system performance detection
- All filtering and search operations are handled server-side via API
- The data structure supports Chinese language content
- Images are served from MinIO storage with proper URL construction