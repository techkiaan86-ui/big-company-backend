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
exports.EmailService = void 0;
var googleapis_1 = require("googleapis");
var path_1 = require("path");
var prisma_1 = require("../utils/prisma");
var monitoring_service_1 = require("./monitoring.service");
var EmailService = /** @class */ (function () {
    function EmailService() {
    }
    /**
     * Initializes the Google JWT Auth with Domain-Wide Delegation.
     */
    EmailService.getAuth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rawJson, credentials, privateKey, cleanKey, matches, keyPath;
            return __generator(this, function (_a) {
                if (this.auth)
                    return [2 /*return*/, this.auth];
                // Support for Railway/Production: Check for raw JSON string in environment variable
                if (process.env.GMAIL_SERVICE_ACCOUNT_JSON) {
                    rawJson = process.env.GMAIL_SERVICE_ACCOUNT_JSON.trim();
                    // Fix: If it is Base64 encoded (doesn't start with {), decode it
                    if (!rawJson.startsWith('{')) {
                        try {
                            rawJson = Buffer.from(rawJson, 'base64').toString('utf8');
                        }
                        catch (e) {
                            console.error('[EmailService] Base64 decode failed, trying as raw string');
                        }
                    }
                    // Fix: If the string is wrapped in extra quotes, remove them
                    if (rawJson.startsWith("'") && rawJson.endsWith("'")) {
                        rawJson = rawJson.slice(1, -1);
                    }
                    else if (rawJson.startsWith('"') && rawJson.endsWith('"')) {
                        rawJson = rawJson.slice(1, -1);
                    }
                    try {
                        credentials = JSON.parse(rawJson);
                        privateKey = credentials.private_key;
                        // 1. Convert any escaped newlines to real ones
                        privateKey = privateKey.replace(/\\n/g, '\n');
                        cleanKey = privateKey
                            .replace('-----BEGIN PRIVATE KEY-----', '')
                            .replace('-----END PRIVATE KEY-----', '')
                            .replace(/\s/g, '');
                        matches = cleanKey.match(/.{1,64}/g);
                        if (matches) {
                            privateKey = __spreadArray(__spreadArray([
                                '-----BEGIN PRIVATE KEY-----'
                            ], matches, true), [
                                '-----END PRIVATE KEY-----',
                                ''
                            ], false).join('\n');
                        }
                        this.auth = new googleapis_1.google.auth.JWT({
                            email: credentials.client_email,
                            key: privateKey,
                            scopes: ['https://www.googleapis.com/auth/gmail.send'],
                            subject: process.env.GMAIL_SENDER_EMAIL || 'noreply@big.co.rw',
                        });
                    }
                    catch (parseError) {
                        console.error('[EmailService] Critical: Failed to parse GMAIL_SERVICE_ACCOUNT_JSON:', parseError.message);
                        throw new Error('Invalid GMAIL_SERVICE_ACCOUNT_JSON format');
                    }
                }
                else {
                    keyPath = path_1.default.resolve(process.env.GMAIL_SERVICE_ACCOUNT_PATH || './google-service-account.json');
                    this.auth = new googleapis_1.google.auth.JWT({
                        keyFile: keyPath,
                        scopes: ['https://www.googleapis.com/auth/gmail.send'],
                        subject: process.env.GMAIL_SENDER_EMAIL || 'noreply@big.co.rw',
                    });
                }
                return [2 /*return*/, this.auth];
            });
        });
    };
    /**
     * Returns a singleton Gmail client instance.
     */
    EmailService.getGmailClient = function () {
        return __awaiter(this, void 0, void 0, function () {
            var auth;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.gmail)
                            return [2 /*return*/, this.gmail];
                        return [4 /*yield*/, this.getAuth()];
                    case 1:
                        auth = _a.sent();
                        this.gmail = googleapis_1.google.gmail({ version: 'v1', auth: auth });
                        return [2 /*return*/, this.gmail];
                }
            });
        });
    };
    /**
     * Sends an email using the Gmail API.
     * @param to Recipient email address
     * @param subject Email subject
     * @param html HTML content of the email
     * @param templateType Categorized type for logging
     * @param relatedEntity Optional linking to a transaction or user
     * @param existingLogId Optional ID of an existing log entry (for retries)
     */
    EmailService.sendEmail = function (to, subject, html, templateType, relatedEntity, existingLogId) {
        return __awaiter(this, void 0, void 0, function () {
            var cleanedTo, log, gmail, utf8Subject, messageParts, message, encodedMessage, res, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cleanedTo = to ? to.trim().toLowerCase() : '';
                        if (cleanedTo.startsWith('www.')) {
                            cleanedTo = cleanedTo.substring(4);
                        }
                        if (!cleanedTo) {
                            console.error("\u274C [EmailService] Cannot send email: Recipient address is undefined (Subject: ".concat(subject, ")"));
                            return [2 /*return*/];
                        }
                        if (!existingLogId) return [3 /*break*/, 2];
                        return [4 /*yield*/, prisma_1.default.systemEmailLog.update({
                                where: { id: existingLogId },
                                data: {
                                    // @ts-ignore
                                    status: 'RETRYING',
                                    retryCount: { increment: 1 }
                                },
                            })];
                    case 1:
                        log = _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, prisma_1.default.systemEmailLog.create({
                            data: {
                                recipientEmail: cleanedTo,
                                // @ts-ignore
                                subject: subject,
                                templateType: templateType,
                                status: 'PENDING',
                                relatedEntityType: relatedEntity === null || relatedEntity === void 0 ? void 0 : relatedEntity.type,
                                relatedEntityId: relatedEntity === null || relatedEntity === void 0 ? void 0 : relatedEntity.id,
                            },
                        })];
                    case 3:
                        log = _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 9, , 12]);
                        return [4 /*yield*/, this.getGmailClient()];
                    case 5:
                        gmail = _a.sent();
                        utf8Subject = "=?utf-8?B?".concat(Buffer.from(subject).toString('base64'), "?=");
                        messageParts = [
                            "From: ".concat(process.env.GMAIL_SENDER_EMAIL),
                            "To: ".concat(cleanedTo),
                            'Content-Type: text/html; charset=utf-8',
                            'MIME-Version: 1.0',
                            "Subject: ".concat(utf8Subject),
                            '',
                            html,
                        ];
                        message = messageParts.join('\r\n');
                        encodedMessage = Buffer.from(message)
                            .toString('base64')
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_')
                            .replace(/=+$/, '');
                        return [4 /*yield*/, gmail.users.messages.send({
                                userId: 'me',
                                requestBody: {
                                    raw: encodedMessage,
                                },
                            })];
                    case 6:
                        res = _a.sent();
                        // Update log to SENT with messageId
                        return [4 /*yield*/, prisma_1.default.systemEmailLog.update({
                                where: { id: log.id },
                                data: {
                                    status: 'SENT',
                                    // @ts-ignore
                                    messageId: res.data.id || undefined
                                },
                            })];
                    case 7:
                        // Update log to SENT with messageId
                        _a.sent();
                        return [4 /*yield*/, monitoring_service_1.monitoringService.reportApiRecovery('GMAIL_API')];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, { success: true, logId: log.id, messageId: res.data.id }];
                    case 9:
                        error_1 = _a.sent();
                        // Update log to FAILED
                        return [4 /*yield*/, prisma_1.default.systemEmailLog.update({
                                where: { id: log.id },
                                data: {
                                    status: 'FAILED',
                                    errorMessage: error_1.message,
                                },
                            })];
                    case 10:
                        // Update log to FAILED
                        _a.sent();
                        console.error("[EmailService] Failed to send email to ".concat(cleanedTo, ":"), error_1.message);
                        return [4 /*yield*/, monitoring_service_1.monitoringService.reportApiFailure('GMAIL_API', error_1.message)];
                    case 11:
                        _a.sent();
                        throw error_1;
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    return EmailService;
}());
exports.EmailService = EmailService;
