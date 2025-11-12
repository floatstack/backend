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
exports.PredictionService = exports.LiquidityClass = void 0;
var tf = require("@tensorflow/tfjs-node");
var database_js_1 = require("../../../config/database.js");
var logger_js_1 = require("../../../utils/logger.js");
// import { sendLowFloatAlert, sendCashRichAlert } from '../notification/service/alertService.js';
// import { syncAgentATMCache } from '../../agent/service/atmService.js';
var LiquidityClass;
(function (LiquidityClass) {
    LiquidityClass[LiquidityClass["LOW_E_FLOAT"] = 0] = "LOW_E_FLOAT";
    LiquidityClass[LiquidityClass["BALANCED"] = 1] = "BALANCED";
    LiquidityClass[LiquidityClass["CASH_RICH"] = 2] = "CASH_RICH";
})(LiquidityClass || (exports.LiquidityClass = LiquidityClass = {}));
var PredictionService = /** @class */ (function () {
    function PredictionService() {
        this.model = null;
        this.modelPath = 'file://./models/liquidity-v1/model.json';
    }
    PredictionService.getInstance = function () {
        if (!PredictionService.instance) {
            PredictionService.instance = new PredictionService();
        }
        return PredictionService.instance;
    };
    PredictionService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = this;
                        return [4 /*yield*/, tf.loadLayersModel(this.modelPath)];
                    case 1:
                        _a.model = _b.sent();
                        logger_js_1.logger.info('AI Prediction model loaded successfully');
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
                        logger_js_1.logger.error("Failed to load AI model from ".concat(this.modelPath), { error: error_1.message });
                        this.model = null;
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    PredictionService.prototype.extractFeatures = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var agent, snapshot, transactions, lastRefill, now, hour, e_float_percentage, withdrawals, deposits, withdrawal_velocity_6h, deposit_velocity_6h, avg_withdrawal_size, time_since_last_refill_hrs, hour_sin, hour_cos, is_peak_hour, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_js_1.prisma.agent.findUnique({
                                where: { id: agentId },
                                include: {
                                    float_snapshots: true,
                                    transaction_logs: {
                                        where: { tx_time: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } }, // last 6 hours
                                        orderBy: { tx_time: 'asc' }
                                    },
                                    refill_events: {
                                        take: 1,
                                        orderBy: { refill_at: 'desc' }
                                    }
                                }
                            })];
                    case 1:
                        agent = _b.sent();
                        if (!agent || !agent.float_snapshots)
                            return [2 /*return*/, null];
                        snapshot = agent.float_snapshots;
                        transactions = agent.transaction_logs;
                        lastRefill = (_a = agent.refill_events) === null || _a === void 0 ? void 0 : _a[0];
                        now = new Date();
                        hour = now.getHours();
                        e_float_percentage = snapshot.e_float.toNumber() / agent.assigned_limit.toNumber();
                        withdrawals = transactions.filter(function (transaction) { return transaction.tx_type === 'withdrawal'; });
                        deposits = transactions.filter(function (transaction) { return transaction.tx_type === 'deposit'; });
                        withdrawal_velocity_6h = withdrawals.reduce(function (sum, transaction) { return sum + transaction.amount.toNumber(); }, 0) / 6;
                        deposit_velocity_6h = deposits.reduce(function (sum, transaction) { return sum + transaction.amount.toNumber(); }, 0) / 6;
                        avg_withdrawal_size = withdrawals.length > 0
                            ? withdrawals.reduce(function (sum, transaction) { return sum + transaction.amount.toNumber(); }, 0) / withdrawals.length
                            : 0;
                        time_since_last_refill_hrs = lastRefill
                            ? (now.getTime() - new Date(lastRefill.refill_at).getTime()) / (1000 * 60 * 60)
                            : 999;
                        hour_sin = Math.sin(2 * Math.PI * hour / 24);
                        hour_cos = Math.cos(2 * Math.PI * hour / 24);
                        is_peak_hour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18) ? 1 : 0;
                        return [2 /*return*/, [
                                e_float_percentage,
                                withdrawal_velocity_6h / 100000,
                                deposit_velocity_6h / 100000,
                                avg_withdrawal_size / 100000,
                                Math.min(time_since_last_refill_hrs / 100, 10),
                                hour_sin,
                                hour_cos,
                                is_peak_hour
                            ]];
                    case 2:
                        error_2 = _b.sent();
                        logger_js_1.logger.error("Feature extraction failed for agent ".concat(agentId), { error: error_2.message });
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Predict liquidity class for an agent
     */
    PredictionService.prototype.predict = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var features, tensor, prediction, probabilityArray, _a, p_low, p_balanced, p_rich, predictedClass;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.model) {
                            logger_js_1.logger.warn('AI model not loaded. Skipping prediction.');
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, this.extractFeatures(agentId)];
                    case 1:
                        features = _b.sent();
                        if (!features)
                            return [2 /*return*/, null];
                        tensor = tf.tensor2d([features]);
                        prediction = this.model.predict(tensor);
                        return [4 /*yield*/, prediction.array()];
                    case 2:
                        probabilityArray = (_b.sent());
                        if (!probabilityArray || !probabilityArray[0] || probabilityArray[0].length !== 3) {
                            tensor.dispose();
                            prediction.dispose();
                            logger_js_1.logger.error("Prediction output invalid for agent ".concat(agentId));
                            return [2 /*return*/, null];
                        }
                        _a = probabilityArray[0], p_low = _a[0], p_balanced = _a[1], p_rich = _a[2];
                        predictedClass = probabilityArray[0].indexOf(Math.max.apply(Math, probabilityArray[0]));
                        tensor.dispose();
                        prediction.dispose();
                        return [2 /*return*/, {
                                predictedClass: predictedClass,
                                probabilities: { low: p_low, balanced: p_balanced, rich: p_rich }
                            }];
                }
            });
        });
    };
    PredictionService.prototype.triggerPrediction = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, predictedClass, probabilities, agent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.predict(agentId)];
                    case 1:
                        result = _a.sent();
                        if (!result)
                            return [2 /*return*/];
                        predictedClass = result.predictedClass, probabilities = result.probabilities;
                        return [4 /*yield*/, database_js_1.prisma.agent.findUnique({ where: { id: agentId } })];
                    case 2:
                        agent = _a.sent();
                        if (!agent)
                            return [2 /*return*/];
                        if (predictedClass === LiquidityClass.LOW_E_FLOAT && probabilities.low > 0.75) {
                            // await sendLowFloatAlert(
                            //     agent,
                            //     `AI Alert: High risk of low float in 6h (${(probabilities.low * 100).toFixed(0)}% confidence)`
                            // );
                            // await syncAgentATMCache(agentId);
                        }
                        if (predictedClass === LiquidityClass.CASH_RICH && probabilities.rich > 0.7) {
                            // await sendCashRichAlert(
                            //     agent,
                            //     `AI: Excess float detected (${(probabilities.rich * 100).toFixed(0)}% confidence)`
                            // );
                        }
                        logger_js_1.logger.info("AI Prediction for ".concat(agent.agent_id, ": ").concat(LiquidityClass[predictedClass], " (").concat((Math.max.apply(Math, Object.values(probabilities)) * 100).toFixed(0), "%)"));
                        return [2 /*return*/];
                }
            });
        });
    };
    return PredictionService;
}());
exports.PredictionService = PredictionService;
