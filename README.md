# 🚀 LaporinAja - Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)

**LaporinAja Backend** is the core engine of a geo-spatial public reporting platform. It handles complex tasks such as EXIF metadata processing, automated report clustering based on coordinate proximity, and synchronized feedback distribution.

## 🌟 Key Features

- **Geo-Spatial Clustering**: Automatically groups reports within a specific radius into a single cluster to prevent administrative redundancy.
- **EXIF Metadata Processing**: Extracts GPS coordinates from uploaded images to verify the authenticity of the reported location.
- **Admin Feedback Synchronization**: Updates all reports within the same cluster simultaneously when a resolution is provided.
- **Secure File Management**: Integrated with Cloudinary for robust image storage and optimization.
- **Real-time Database**: Powered by Supabase (PostgreSQL) with Row Level Security (RLS).

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Image Hosting**: Cloudinary
- **Authentication**: JWT & Supabase Auth

## 📂 Architecture Overview

The system follows a modular controller-router pattern:
- **Controllers**: Contains business logic (clustering, metadata extraction, feedback mapping).
- **Routes**: Defines the API endpoints for Mobile/Web clients and Admin Panel.
- **Middleware**: Handles file uploads (Multer) and authentication.



## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Supabase Account
- Cloudinary Account

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/Yusufsw1/backendLaporin.git](https://github.com/Yusufsw1/backendLaporin.git)
   cd backendLaporin
2. Install dependencies:
   ```bash
   npm install
3. Configure Environment Variables (.env):
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   CLOUDINARY_CLOUD_NAME=your_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
4. Run in development mode:
   ```bash
   npm run dev

🛰️ API Endpoints (Brief)
Method	Endpoint	Description
POST	/api/v1/reports/create	Submit new report with image & EXIF check
GET	/api/v1/reports/all	Get all reports with cluster mapping
POST	/api/v1/reports/:id/feedback	Submit admin resolution for a cluster
DELETE	/api/v1/reports/:id	Permanent report & cluster cleanup
PUT	/api/v1/reports/:id/status	Update report progress status


🤝 Contact
Yusuf - GitHub Profile 
Project Link: https://github.com/Yusufsw1/backendLaporin


