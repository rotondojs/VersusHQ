## VersusHQ

Welcome to VersusHQ! VersusHQ is a web application where users can sign up to
play games, battle in tournaments, and chat with each other! Whether you want
to play casually with your friends, or up your stats through competition,
VersusHQ is the place to do it!

### Core Features

- Live match rooms for Nim, Number Guesser, and Battleship
- Human and AI Battleship opponents
- Tournament brackets with hosts, participants, spectators, and tournament
  chat
- Game-room chat and forum discussions
- User profiles, profile pictures, and tournament history
- Google OAuth sign-in and guided profile setup
- Leaderboard rankings and customizable UI themes

### Playable Games

| Game           | Description                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------- |
| Nim            | Remove items from piles and avoid taking the last losing move.                               |
| Number Guesser | Guess the hidden number before your opponent does.                                           |
| Battleship     | Place ships and take turns trying to sink the other fleet, with both human and AI opponents. |

## Getting Started

Run `npm install` in the root directory to install all dependencies for the
`client`, `server`, and `shared` folders.

### Dependencies

| Dependency              | Version             | Used In            | Purpose                                 |
| ----------------------- | ------------------- | ------------------ | --------------------------------------- |
| `react` / `react-dom`   | `^19.2.3`           | `client`           | Core frontend UI rendering              |
| `@chakra-ui/react`      | `^3.34.0`           | `client`           | Component library for the UI            |
| `@emotion/react`        | `^11.14.0`          | `client`           | Styling runtime used by Chakra UI       |
| `@tanstack/react-query` | `^5.96.0`           | `client`           | Server-state fetching and caching       |
| `react-router-dom`      | `^7.9.5`            | `client`           | Client-side routing                     |
| `axios`                 | `^1.13.1`           | `client`           | HTTP requests to the backend            |
| `socket.io-client`      | `^4.8.1`            | `client`           | Realtime communication with the server  |
| `recharts`              | `^3.8.0`            | `client`           | Charts and data visualizations          |
| `react-icons`           | `^5.6.0`            | `client`           | Icon set used in the UI                 |
| `dayjs`                 | `^1.11.19`          | `client`           | Date and time formatting                |
| `react-error-boundary`  | `^6.0.0`            | `client`           | Error boundaries for React views        |
| `@react-oauth/google`   | `^0.13.4`           | `client`           | Google OAuth integration                |
| `express`               | `^5.2.1`            | `server`           | HTTP API server                         |
| `socket.io`             | `^4.8.1`            | `server`           | Realtime event server                   |
| `keyv` / `@keyv/mongo`  | `^5.5.5` / `^3.1.0` | `server`           | Persistence and MongoDB-backed storage  |
| `dotenv`                | `^17.2.3`           | `server`           | Environment variable loading            |
| `zod`                   | `^4.3.6`            | `server`, `shared` | Schema validation and type-safe parsing |

### Adding Environment Variables

Add the following to `/client/.env` to enable Google OAuth 2.0 locally:

```
VITE_GOOGLE_CLIENT_ID=123732095485-24j1dqlh69koovr6e8menci8ootbj1ub.apps.googleusercontent.com
```

Add the following to the `/server/.env` to store data to the VersusHQ
Development Database:

```
MONGO_STR=mongodb+srv://KingSeeker:KingKongRocks@primarycluster.ayw5m.mongodb.net/
MONGO_DB_NAME=GameNiteDev
```

### Working on the Application

While you're working on the application, it's useful to run it in "development
mode" locally. Development mode watches files for changes and updates the
application when changes happen.

To run VersusHQ locally in development mode, do one of the following:

1. Run `npm run dev` in the top-level directory
2. Open two terminal windows
   - In the first, navigate to the `server` directory and run `npm run dev`
   - In the second, navigate to the `client` directory and also run
     `npm run dev`

The second terminal window, the one in the `client` directory, shows a URL
that you should go to to preview the application, probably
<http://localhost:4530/>. You can use the default username/password
combinations user0/pwd0000, user1/pwd1111, user2/pwd2222, and user3/pwd3333 to
log in.

### Checking the Application

Checks can be run on every part of the application at once by running the
following commands from the repository root:

- `npm run check` - Checks all three projects with TypeScript
- `npm run lint` - Checks all three projects with ESLint
- `npm run prettier` - Verifies formatting with Prettier
- `npm run test` - Runs Vitest tests on all three projects and end-to-end
  Playwright tests

### Building the Application

If you want to deploy the application or build it in production mode, running
`npm run build -w=client` in the root of the repository will create the
production build of the client. Then, the server can be started in production
mode by running `npm start -w=server` and accessed by going to
<http://localhost:8000/>.

## Codebase Folder Structure

- `client`: Contains the frontend application code, responsible for the user
  interface and interacting with the backend. This directory includes all
  React components and related assets.
- `server`: Contains the backend application code, handling the logic, APIs,
  and database interactions. It serves requests from the client and processes
  data accordingly.
- `shared`: Contains all shared type definitions that are used by both the
  client and server. This helps maintain consistency and reduces duplication
  of code between the two folders.

## API Routes

The server provides the following REST endpoints: requests are routed to these
endpoints in `server/src/app.ts`.

#### `/api/game`

| Endpoint  | Method | Description                           |
| --------- | ------ | ------------------------------------- |
| `/create` | POST   | Create new game                       |
| `/list`   | GET    | List all games                        |
| `/:id`    | GET    | Get information about a specific game |

#### `/api/thread`

| Endpoint       | Method | Description                       |
| -------------- | ------ | --------------------------------- |
| `/create`      | POST   | Create new forum post             |
| `/list`        | GET    | List all forum posts              |
| `/:id`         | GET    | Get information about a form post |
| `/:id/comment` | POST   | Add a comment to a forum post     |

#### `/api/tournament`

| Endpoint      | Method | Description                     |
| ------------- | ------ | ------------------------------- |
| `/create`     | POST   | Create a new tournament         |
| `/list`       | GET    | List all tournaments            |
| `/:id`        | GET    | Get a tournament by ID          |
| `/:id/edit`   | POST   | Edit a tournament               |
| `/:id/join`   | POST   | Join a tournament               |
| `/:id/leave`  | POST   | Leave a tournament              |
| `/:id/cancel` | POST   | Cancel a tournament             |
| `/:id/start`  | POST   | Start a tournament              |
| `/:id/kick`   | POST   | Remove a player from tournament |
| `/:id`        | DELETE | Delete a tournament             |

#### `/api/user`

| Endpoint                        | Method | Description                      |
| ------------------------------- | ------ | -------------------------------- |
| `/list`                         | GET    | List all users                   |
| `/list`                         | POST   | Get details of a list of users   |
| `/login`                        | POST   | Validate username/password entry |
| `/signup`                       | POST   | Create a new user                |
| `/signup-oauth`                 | POST   | Create a user with OAuth         |
| `/:username/picture`            | POST   | Upload a profile picture         |
| `/:username/picture/:pictureId` | GET    | Get a user's profile picture     |
| `/:username`                    | POST   | Update a user's profile fields   |
| `/:username`                    | GET    | Get information about a user     |

### Websockets

The Socket.io API for event-driven communication between clients and the
server is detailed in `shared/src/socket.types.ts`. This includes live game
updates, chat events, and tournament watch/update events.

### Contributors

| Name         | GitHub                                                 |
| ------------ | ------------------------------------------------------ |
| Ananya Saggi | [@AnanyaS05](https://github.com/AnanyaS05)             |
| Andrea Son   | [@SonAndrea](https://github.com/SonAndrea)             |
| Caio DaSilva | [@caiodasilva2005](https://github.com/caiodasilva2005) |
| John Rotondo | [@Rotondoj1](https://github.com/Rotondoj1)             |
