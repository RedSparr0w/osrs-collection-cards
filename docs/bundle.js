/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/CanvasManager.ts"
/*!******************************!*\
  !*** ./src/CanvasManager.ts ***!
  \******************************/
(__unused_webpack_module, exports) {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nclass CanvasManager {\n    constructor(canvasId) {\n        this.image = null;\n        let canvas = document.getElementById(canvasId);\n        if (!canvas) {\n            const newCanvas = document.createElement('canvas');\n            newCanvas.id = canvasId;\n            document.body.appendChild(newCanvas);\n            canvas = newCanvas;\n        }\n        const ctx = canvas.getContext('2d');\n        this.canvas = canvas;\n        this.ctx = ctx;\n        this.handleResize = this.handleResize.bind(this);\n        window.addEventListener('resize', this.handleResize);\n        this.handleResize();\n    }\n    handleResize() {\n        this.canvas.width = window.innerWidth;\n        this.canvas.height = window.innerHeight;\n        this.redraw();\n    }\n    loadImage(src) {\n        const img = new Image();\n        img.src = src;\n        img.onload = () => {\n            this.image = img;\n            this.redraw();\n        };\n        img.onerror = () => {\n            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);\n            this.ctx.fillStyle = 'red';\n            this.ctx.font = '20px sans-serif';\n            this.ctx.fillText('Image not found', 20, 40);\n        };\n    }\n    redraw() {\n        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);\n        if (this.image) {\n            // Fit image to canvas while preserving aspect ratio\n            const scale = Math.min(this.canvas.width / this.image.width, this.canvas.height / this.image.height);\n            const drawWidth = this.image.width * scale;\n            const drawHeight = this.image.height * scale;\n            const x = (this.canvas.width - drawWidth) / 2;\n            const y = (this.canvas.height - drawHeight) / 2;\n            this.ctx.drawImage(this.image, x, y, drawWidth, drawHeight);\n        }\n    }\n}\nexports[\"default\"] = CanvasManager;\n\n\n//# sourceURL=webpack://osrs-collection-cards/./src/CanvasManager.ts?\n}");

/***/ },

/***/ "./src/app.ts"
/*!********************!*\
  !*** ./src/app.ts ***!
  \********************/
(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __importDefault = (this && this.__importDefault) || function (mod) {\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst CanvasManager_1 = __importDefault(__webpack_require__(/*! ./CanvasManager */ \"./src/CanvasManager.ts\"));\nwindow.addEventListener('DOMContentLoaded', () => {\n    const canvasManager = new CanvasManager_1.default('main-canvas');\n    canvasManager.loadImage('./images/CardTemplate.png');\n});\n\n\n//# sourceURL=webpack://osrs-collection-cards/./src/app.ts?\n}");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/app.ts");
/******/ 	
/******/ })()
;