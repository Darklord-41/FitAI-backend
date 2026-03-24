# FitAI Backend

This is the core REST API backend for the FitAI application. It is built with Node.js, Express, and MongoDB, and it securely handles user authentication, profile management, workout scheduling, and data processing. It also integrates with a Python-based machine learning model (`model.py`) for advanced fitness tracking and AI features.

## Tech Stack & Libraries
- **Runtime Environment:** [Node.js](https://nodejs.org/)
- **Web Framework:** [Express.js](https://expressjs.com/)
- **Database:** [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/)
- **Authentication & Security:** JWT (`jsonwebtoken`), `bcryptjs`, `cors`
- **File Handling:** `multer` (for avatar and fitness data uploads)
- **Email Services:** `nodemailer` (via Google OAuth2)
- **AI Integration:** Python script execution (`model.py`)

## Project Structure
```text
fitai-backend/
├── controllers/    # Route handler functions
├── middleware/     # Custom Express middlewares (Auth, Error handling, Multer)
├── models/         # Mongoose DB schemas (User, Workout, etc.)
├── routes/         # Express route definitions
├── utils/          # Helper functions and utilities
├── uploads/        # Directory for user-uploaded files
├── model.py        # Python Machine Learning model script
└── server.js       # Main application entry point
```

## Setup & Installation

**1. Clone the repository and navigate to the backend folder:**
```bash
cd fitai-complete/fitai-backend
```

**2. Install Node.js dependencies:**
```bash
npm install
# or
pnpm install
```

**3. Set up Environment Variables:**
Copy the template file `.env.example` to a new file named `.env`:
```bash
cp .env.example .env
```
Fill in the necessary credentials in `.env`:
- `PORT`: The port your server runs on (default: `5000`)
- `MONGO_URI`: Your MongoDB connection string (Local or Atlas)
- `JWT_SECRET`: A secure, random string for token generation
- `GMAIL_*`: Your Google OAuth2 credentials (`GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`)
- `CLIENT_URL`: The frontend URL to allow CORS (default: `http://localhost:5173`)

**4. Install Python dependencies (for `model.py`):**
Make sure Python 3.x is installed, and install any required Python packages (like `numpy`, `pandas`, `scikit-learn`, etc.) if needed for the AI model.
```bash
pip install -r requirements.txt # (If applicable)
```

## Running the Server

**Development Mode (auto-restarts on file changes):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Once running, the server will be available at `http://localhost:5000` (or whichever port you specified), and it will serve static uploads via the `/uploads` route.

## API Endpoints Overview
The following main route prefixes are exposed natively:
- `GET /api/health` - Health check status
- `/api/auth` - User registration, login, and token handling
- `/api/user` - User profile retrieval, modification, and avatar uploads
- `/api/workouts` - Create, read, update, and delete workout routines
- `/api/fitness` - Advanced fitness metrics and AI model interaction

## Testing
To test endpoints effectively locally, you can use [Postman](https://www.postman.com/) or [Thunder Client](https://www.thunderclient.com/). Make sure to set up the Authorization header as `Bearer <token>` for protected routes after logging in.
