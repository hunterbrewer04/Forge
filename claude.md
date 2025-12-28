# Forge Sports Performance - PWA

## Project Overview

**Forge** is a Progressive Web App (PWA) designed for a personal training and baseball training business. This app serves as the primary platform for client management, communication, and scheduling for Forge Sports Performance.

### Core Purpose
- **Client Management**: Personal training and baseball training client platform
- **Messaging**: Real-time communication between trainers and clients
- **Scheduling**: Session booking and calendar management for training sessions
- **Progressive Web App**: Installable, works offline, mobile-optimized experience

### Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (Auth, Database, Real-time)
- **Deployment**: Vercel
- **PWA Features**: Service workers, installable, offline support

### Key Features
1. **Authentication System** (`/login`, `/signup`)
   - User authentication via Supabase Auth
   - Profile management
   - Role-based access (trainers vs clients)

2. **Messaging Platform** (`/chat`)
   - Real-time chat conversations
   - Message history
   - Conversation management
   - Client-trainer communication

3. **Scheduling System** (`/schedule`)
   - Training session scheduling
   - Calendar integration
   - Session management

4. **Profile Management** (`/profile`)
   - User profiles
   - Client information
   - Training preferences and goals

### App Structure
```
/app
├── /chat          # Messaging system
├── /schedule      # Session scheduling
├── /profile       # User profiles
├── /home          # Main dashboard
├── /login         # Authentication
└── /signup        # User registration
```

### Database (Supabase)
- User profiles with role management
- Message history and conversations
- Training sessions and schedules
- Row Level Security (RLS) policies
- Real-time subscriptions for chat

---

## Mobile Redesign - Forge Sports Performance UI

The Forge app is undergoing a mobile UI redesign based on the Forge Sports Performance brand.

### Design Resources
- **Full Specification**: `/docs/mockups/FORGE_MOBILE_DESIGN_SPEC.md`
- **Mockups**: `/docs/mockups/` (HTML + images)
- **Implementation Phases**: `/docs/mockups/IMPLEMENTATION_PHASES.md`

### Design System Quick Reference
- Primary Color: `#ff6714` (Molten Orange)
- Background: `#1C1C1C` (Charcoal Black)
- Font: Space Grotesk
- Icons: Material Symbols Outlined
- Mobile-first, dark mode primary

### Implementation Rules
1. Always reference `/docs/mockups/FORGE_MOBILE_DESIGN_SPEC.md` before implementing UI components
2. Match mockup designs pixel-perfect where possible
3. Maintain existing functionality while updating UI
4. Use existing Supabase data structures
5. Preserve all security measures (RLS, auth flows)
6. Test on mobile viewport (375px - 428px)

---

## Development Guidelines

### Code Standards
- TypeScript strict mode
- Component-based architecture
- Server/Client component separation (Next.js App Router)
- Responsive design (mobile-first)
- Accessibility best practices

### Security
- Supabase Row Level Security (RLS) enabled
- Secure authentication flows
- Protected API routes
- Environment variable management

### Performance
- Optimized images and assets
- Code splitting
- PWA caching strategies
- Vercel Speed Insights enabled
