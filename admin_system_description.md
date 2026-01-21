# Admin System Overview

The KART Admin System is a comprehensive management suite designed for platform oversight, moderation, and financial control. It follows the same premium mobile-first aesthetic as the rest of the application, with full support for dark mode and real-time data integration via Supabase.

## Core Modules

### 1. Dashboard Overview
- **KPI Tracking**: Real-time stats for Users, Listings, Orders, and Platform Revenue.
- **Activity Feed**: Quick view of recent users, new orders, and latest subscription sign-ups.
- **Quick Actions**: One-tap access to all critical moderation hubs.

### 2. User & Trust Management
- **User Directory**: Search and filter through the entire user base.
- **Moderation Tools**: Ability to ban/unban users and update account roles (e.g., granting Admin status).
- **Verification Hub**: Approval workflow for University Student ID verifications, unlocking trusted seller badges.

### 3. Content Moderation
- **Listing Management**: Oversight of all marketplace products with tools to remove or flag "Active" or "Sold" items.
- **Review Moderation**: Reviewing transaction feedback to ensure platform integrity and prevent spam.
- **Reporting System**: Centralized queue for handling user-submitted reports against products or profiles.

### 4. Financial & Transaction Control
- **Order & Escrow Hub**: Management of all sales. Admins can track the escrow lifecycle and intervene in disputes.
- **Withdrawal Management**: Processing manual payout requests from seller wallets to external mobile money/bank accounts.
- **Transaction History**: Audit trail of all wallet movements across the platform.

### 5. Growth & Monetization
- **Subscription Management**: Configuration of Monthly, 6-Month, and Yearly premium plans.
- **Advertising Portal**: Management of "Featured" and "Boosted" listings, including visibility duration and cost.

---

# Generation Prompt for Google Stitch

If you want to expand or regenerate the admin pages, use this prompt for the best results:

> "Act as a Senior Full-Stack Engineer. I need to build a comprehensive Admin Dashboard using Next.js (App Router), Tailwind CSS, and Supabase. The design must match a premium 'Mobile and Web' aesthetic with a dark/glassmorphic theme (`bg-[#131d1f]`, card colors `bg-[#1e292b]`, and primary accent `#1daddd`).
>
> **Core Requirements:**
> 1. **Security**: Wrap every page in the `<AdminAccessCheck>` component. Ensure all data fetching is done server-side using the Supabase server client, with proper row-level security.
> 2. **Navigation**: Use the established `AdminSidebar` (from `app/dashboard/admin/layout.js`) for a consistent multi-tab layout.
> 3. **Themed UI**: Use 'Material Symbols Outlined' for all icons. Implement responsive tables with 'truncate' for long text and 'blur' effects for card headers.
>
> **Create the following specific pages:**
> - **Management Hubs**: `Users`, `Products`, `Orders`, `Verifications`, and `Withdrawals`.
> - **Moderation Queues**: `Reviews`, `Reports`, and `Ad Campaigns`.
> - **Features Needed**: Each page needs search bars, status filters (e.g., Pending, Approved, Rejected), and 'Action' modals (e.g., 'Approve Verification' or 'Ban User') that trigger Supabase updates via API routes or server actions.
>
> **Coding Style**: Use clean functional components, handle loading states with Suspense or skeletons, and ensure all buttons have subtle micro-animations (e.g., `active:scale-95`)."
