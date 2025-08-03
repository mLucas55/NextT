# NextT
## Overview
This is repository for the backend of NextT. This application is built in [Node.js](https://nodejs.org) using [Express.js](https://expressjs.com/) as well as [TypeScript](https://www.typescriptlang.org/). This server primary acts as a proxy to the MBTA API and sends collected data to the frontend application in real-time.
## Structure
The structure of this repository is actually quite simple. There are only 4 files with code in them.
- [app.ts](app.ts) - Serves and the primary entry point to the application.
- [server.ts](server.ts) - Configuration of the server and intializiation of the websocket.
- [tracker.ts](tracker.ts) - Contains all code related to caching and relaying data from the MBTA API to the frontend. Most of the code is in this file.
- [mbta.ts](api/mbta.ts) - Mostly contains types for the MBTA API which mostly were generated from their API spec. It also contains the client which handles requests to the API.
