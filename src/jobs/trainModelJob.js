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
exports.trainAndDeployModel = trainAndDeployModel;
var tf = require("@tensorflow/tfjs-node");
var logger_js_1 = require("../utils/logger.js");
var predictionService_js_1 = require("../modules/prediction/service/predictionService.js");
var dataGenerator_js_1 = require("./dataGenerator.js");
var path_1 = require("path");
var promises_1 = require("fs/promises");
var MODEL_DIR = path_1.default.join(process.cwd(), '..', 'modules', 'prediction', 'service', 'models', 'liquidity-v1');
var TEMP_MODEL_DIR = path_1.default.join(process.cwd(), 'models', 'liquidity-temp');
function trainAndDeployModel() {
    return __awaiter(this, void 0, void 0, function () {
        var samples, splitIdx, train, test, xs_train, ys_train, xs_test, ys_test, model, evalResult, testLoss, testAcc, lossData, accData, data, service, error_1;
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 13, , 14]);
                    logger_js_1.logger.info('Starting AI model training from synthetic data...');
                    return [4 /*yield*/, (0, dataGenerator_js_1.loadTrainingData)()];
                case 1:
                    samples = _h.sent();
                    logger_js_1.logger.info("Loaded ".concat(samples.length, " synthetic samples"));
                    if (samples.length < 100) {
                        throw new Error('Not enough samples to train');
                    }
                    splitIdx = Math.floor(samples.length * 0.8);
                    train = samples.slice(0, splitIdx);
                    test = samples.slice(splitIdx);
                    xs_train = tf.tensor2d(train.map(function (s) { return s.features; }));
                    ys_train = tf.oneHot(tf.tensor1d(train.map(function (s) { return s.label; }), 'int32'), 3);
                    xs_test = tf.tensor2d(test.map(function (s) { return s.features; }));
                    ys_test = tf.oneHot(tf.tensor1d(test.map(function (s) { return s.label; }), 'int32'), 3);
                    model = tf.sequential();
                    model.add(tf.layers.dense({ inputShape: [8], units: 64, activation: 'relu' }));
                    model.add(tf.layers.dropout({ rate: 0.3 }));
                    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
                    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
                    model.compile({
                        optimizer: tf.train.adam(0.001),
                        loss: 'categoricalCrossentropy',
                        metrics: ['accuracy']
                    });
                    // 4. Train
                    logger_js_1.logger.info('Training model...');
                    console.log('Training model...');
                    return [4 /*yield*/, model.fit(xs_train, ys_train, {
                            epochs: 25,
                            batchSize: 32,
                            validationData: [xs_test, ys_test],
                            callbacks: {
                                onEpochEnd: function (epoch, logs) { return __awaiter(_this, void 0, void 0, function () {
                                    var loss, acc, valAcc;
                                    var _a, _b, _c, _d, _e, _f;
                                    return __generator(this, function (_g) {
                                        if (epoch % 5 === 0 || epoch === 24) {
                                            loss = (_b = (_a = logs === null || logs === void 0 ? void 0 : logs.loss) === null || _a === void 0 ? void 0 : _a.toFixed(4)) !== null && _b !== void 0 ? _b : 'N/A';
                                            acc = (_d = (_c = logs === null || logs === void 0 ? void 0 : logs.acc) === null || _c === void 0 ? void 0 : _c.toFixed(4)) !== null && _d !== void 0 ? _d : 'N/A';
                                            valAcc = (_f = (_e = logs === null || logs === void 0 ? void 0 : logs.val_acc) === null || _e === void 0 ? void 0 : _e.toFixed(4)) !== null && _f !== void 0 ? _f : 'N/A';
                                            logger_js_1.logger.info("Epoch ".concat(epoch, ": loss=").concat(loss, ", acc=").concat(acc, ", val_acc=").concat(valAcc));
                                        }
                                        return [2 /*return*/];
                                    });
                                }); }
                            }
                        })];
                case 2:
                    _h.sent();
                    evalResult = model.evaluate(xs_test, ys_test);
                    if (!evalResult) {
                        throw new Error('Model evaluation failed: no result returned');
                    }
                    testLoss = void 0;
                    testAcc = void 0;
                    if (!Array.isArray(evalResult)) return [3 /*break*/, 5];
                    if (evalResult.length < 2) {
                        throw new Error('Expected at least 2 metrics from evaluation');
                    }
                    return [4 /*yield*/, ((_a = evalResult[0]) === null || _a === void 0 ? void 0 : _a.data())];
                case 3:
                    lossData = _h.sent();
                    return [4 /*yield*/, ((_b = evalResult[1]) === null || _b === void 0 ? void 0 : _b.data())];
                case 4:
                    accData = _h.sent();
                    if (!lossData || !accData) {
                        throw new Error('Failed to extract evaluation metrics');
                    }
                    testLoss = (_c = lossData[0]) !== null && _c !== void 0 ? _c : 0;
                    testAcc = (_d = accData[0]) !== null && _d !== void 0 ? _d : 0;
                    // Dispose evaluation tensors
                    (_e = evalResult[0]) === null || _e === void 0 ? void 0 : _e.dispose();
                    (_f = evalResult[1]) === null || _f === void 0 ? void 0 : _f.dispose();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, evalResult.data()];
                case 6:
                    data = _h.sent();
                    testLoss = (_g = data[0]) !== null && _g !== void 0 ? _g : 0;
                    testAcc = 0; // Single metric case
                    evalResult.dispose();
                    _h.label = 7;
                case 7:
                    logger_js_1.logger.info("Test Loss: ".concat(testLoss.toFixed(4), ", Test Accuracy: ").concat((testAcc * 100).toFixed(2), "%"));
                    if (testAcc < 0.75) {
                        throw new Error("Model accuracy too low: ".concat((testAcc * 100).toFixed(2), "%"));
                    }
                    // 6. Save to temp
                    return [4 /*yield*/, promises_1.default.rm(TEMP_MODEL_DIR, { recursive: true, force: true })];
                case 8:
                    // 6. Save to temp
                    _h.sent();
                    return [4 /*yield*/, model.save("file://".concat(TEMP_MODEL_DIR))];
                case 9:
                    _h.sent();
                    logger_js_1.logger.info("Model saved to temp directory: ".concat(TEMP_MODEL_DIR));
                    // 7. Atomic deploy
                    return [4 /*yield*/, promises_1.default.rm(MODEL_DIR, { recursive: true, force: true })];
                case 10:
                    // 7. Atomic deploy
                    _h.sent();
                    return [4 /*yield*/, promises_1.default.rename(TEMP_MODEL_DIR, MODEL_DIR)];
                case 11:
                    _h.sent();
                    logger_js_1.logger.info("Model deployed to: ".concat(MODEL_DIR));
                    service = predictionService_js_1.PredictionService.getInstance();
                    return [4 /*yield*/, service.initialize()];
                case 12:
                    _h.sent();
                    logger_js_1.logger.info('Model hot-swapped in prediction service');
                    logger_js_1.logger.info('AI model trained and deployed successfully!');
                    // Cleanup
                    xs_train.dispose();
                    ys_train.dispose();
                    xs_test.dispose();
                    ys_test.dispose();
                    model.dispose();
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _h.sent();
                    logger_js_1.logger.error('Model training failed', { error: error_1.message, stack: error_1.stack });
                    throw error_1;
                case 14: return [2 /*return*/];
            }
        });
    });
}
