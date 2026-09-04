"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
var client_1 = require("@prisma/client");
var dotenv = require("dotenv");
dotenv.config();
// Retry configuration
var MAX_RETRIES = 3;
var RETRY_DELAY = 1000; // 1 second
// Create Prisma client with connection pool settings for Railway
var prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URI,
        },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
// Helper function to retry database operations
function withRetry(operation_1) {
    return __awaiter(this, arguments, void 0, function (operation, retries) {
        var error_1, reconnectError_1;
        var _a;
        if (retries === void 0) { retries = MAX_RETRIES; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 10]);
                    return [4 /*yield*/, operation()];
                case 1: return [2 /*return*/, _b.sent()];
                case 2:
                    error_1 = _b.sent();
                    if (!(retries > 0 && ((_a = error_1.message) === null || _a === void 0 ? void 0 : _a.includes('Server has closed the connection')))) return [3 /*break*/, 9];
                    console.log("Database connection lost, retrying... (".concat(MAX_RETRIES - retries + 1, "/").concat(MAX_RETRIES, ")"));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, RETRY_DELAY); })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, prisma.$disconnect()];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, prisma.$connect()];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    reconnectError_1 = _b.sent();
                    console.error('Reconnection attempt failed:', reconnectError_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, withRetry(operation, retries - 1)];
                case 9: throw error_1;
                case 10: return [2 /*return*/];
            }
        });
    });
}
// Initial connection with retry
var connectWithRetry = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (attempts) {
        var i, error_2;
        if (attempts === void 0) { attempts = 3; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < attempts)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 7]);
                    return [4 /*yield*/, prisma.$connect()];
                case 3:
                    _a.sent();
                    console.log('✅ Database connected successfully');
                    return [2 /*return*/];
                case 4:
                    error_2 = _a.sent();
                    console.error("\u274C Database connection attempt ".concat(i + 1, " failed:"), error_2);
                    if (!(i < attempts - 1)) return [3 /*break*/, 6];
                    console.log("Retrying in ".concat(RETRY_DELAY, "ms..."));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, RETRY_DELAY); })];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 7];
                case 7:
                    i++;
                    return [3 /*break*/, 1];
                case 8:
                    console.error('❌ All database connection attempts failed');
                    return [2 /*return*/];
            }
        });
    });
};
// Connect on startup
connectWithRetry();
// Graceful shutdown
process.on('beforeExit', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
process.on('SIGINT', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
process.on('SIGTERM', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); });
exports.default = prisma;
