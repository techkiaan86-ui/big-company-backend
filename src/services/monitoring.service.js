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
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
var prisma_1 = require("../utils/prisma");
var MonitoringService = /** @class */ (function () {
    function MonitoringService() {
        // Simple in-memory debounce to prevent spam
        this.lastAlerts = {};
        this.ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 mins
    }
    MonitoringService.prototype.reportApiFailure = function (apiName, errorMessage) {
        return __awaiter(this, void 0, void 0, function () {
            var now, lastAlert, EmailService, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        now = Date.now();
                        lastAlert = this.lastAlerts[apiName];
                        // Debounce email spam
                        if (lastAlert && (now - lastAlert) < this.ALERT_COOLDOWN_MS) {
                            return [2 /*return*/];
                        }
                        this.lastAlerts[apiName] = now;
                        console.error("\uD83D\uDEA8 [Monitoring] ".concat(apiName, " FAILURE: ").concat(errorMessage));
                        // Create unacknowledged alert in DB
                        return [4 /*yield*/, prisma_1.default.systemAlert.create({
                                data: {
                                    apiName: apiName,
                                    errorMessage: errorMessage,
                                    status: 'failed',
                                    failureTime: new Date()
                                }
                            })];
                    case 1:
                        // Create unacknowledged alert in DB
                        _a.sent();
                        EmailService = require('./email.service').EmailService;
                        // Send Email to Admin
                        return [4 /*yield*/, EmailService.sendEmail('admin@big.co.rw', "[CRITICAL] ".concat(apiName, " is DOWN"), "<h2>Service Failure Alert</h2><p><strong>API:</strong> ".concat(apiName, "</p><p><strong>Time:</strong> ").concat(new Date().toISOString(), "</p><p><strong>Error:</strong> ").concat(errorMessage, "</p>"), 'SYSTEM_ALERT')];
                    case 2:
                        // Send Email to Admin
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.error('Failed to report API failure:', err_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MonitoringService.prototype.reportApiRecovery = function (apiName) {
        return __awaiter(this, void 0, void 0, function () {
            var unresolvedAlerts, EmailService, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, prisma_1.default.systemAlert.findMany({
                                where: { apiName: apiName, status: 'failed' }
                            })];
                    case 1:
                        unresolvedAlerts = _a.sent();
                        if (!(unresolvedAlerts.length > 0)) return [3 /*break*/, 4];
                        console.log("\u2705 [Monitoring] ".concat(apiName, " RECOVERY detected"));
                        // Auto-resolve them
                        return [4 /*yield*/, prisma_1.default.systemAlert.updateMany({
                                where: { apiName: apiName, status: 'failed' },
                                data: {
                                    status: 'resolved',
                                    resolvedTime: new Date()
                                }
                            })];
                    case 2:
                        // Auto-resolve them
                        _a.sent();
                        // Clear debounce
                        delete this.lastAlerts[apiName];
                        EmailService = require('./email.service').EmailService;
                        return [4 /*yield*/, EmailService.sendEmail('admin@big.co.rw', "[RECOVERY] ".concat(apiName, " is Operational"), "<h2>Service Recovery Alert</h2><p><strong>API:</strong> ".concat(apiName, "</p><p>The service has recovered and is now operational.</p>"), 'SYSTEM_ALERT')];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err_2 = _a.sent();
                        console.error('Failed to report API recovery:', err_2);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return MonitoringService;
}());
exports.MonitoringService = MonitoringService;
exports.monitoringService = new MonitoringService();
