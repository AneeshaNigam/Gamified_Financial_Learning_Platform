"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const socket_1 = require("./config/socket");
const redis_1 = require("./config/redis");
const battle_socket_1 = require("./modules/battle/battle.socket");
const presence_socket_1 = require("./modules/presence/presence.socket");
const matchmaking_socket_1 = require("./modules/matchmaking/matchmaking.socket");
const room_socket_1 = require("./modules/room/room.socket");
const logger_1 = __importDefault(require("./utils/logger"));
const startServer = async () => {
    await (0, database_1.connectDatabase)();
    const server = http_1.default.createServer(app_1.default);
    // Initialize Socket.io with Redis adapter
    const io = (0, socket_1.initializeSocketServer)(server);
    // Register all socket event handlers
    (0, presence_socket_1.registerPresenceHandlers)(io);
    (0, matchmaking_socket_1.registerMatchmakingHandlers)(io);
    (0, room_socket_1.registerRoomHandlers)(io);
    (0, battle_socket_1.registerSocketHandlers)(io);
    server.listen(env_1.env.PORT, () => {
        logger_1.default.info(`Server running on port ${env_1.env.PORT}`);
        logger_1.default.info(`Socket.io ready for connections`);
    });
    const shutdown = async () => {
        logger_1.default.info('Shutting down server...');
        server.close(async () => {
            await (0, redis_1.disconnectRedis)();
            await (0, database_1.disconnectDatabase)();
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    return server;
};
exports.startServer = startServer;
