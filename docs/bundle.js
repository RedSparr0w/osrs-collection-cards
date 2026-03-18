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

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nclass CanvasManager {\n    constructor(canvasId, targetFPS = 60) {\n        this.animationCallbacks = [];\n        this.animationFrameId = null;\n        this.frameCount = 0;\n        this.lastFrameTime = 0;\n        this._targetFPS = targetFPS;\n        this.frameInterval = 1000 / targetFPS;\n        let canvas = document.getElementById(canvasId);\n        if (!canvas) {\n            const newCanvas = document.createElement('canvas');\n            newCanvas.id = canvasId;\n            document.body.appendChild(newCanvas);\n            canvas = newCanvas;\n        }\n        this.canvas = canvas;\n        this.ctx = canvas.getContext('2d');\n        this.handleResize = this.handleResize.bind(this);\n        window.addEventListener('resize', this.handleResize);\n        this.handleResize();\n        this.startAnimationLoop();\n    }\n    // --- Framerate control ---\n    get targetFPS() {\n        return this._targetFPS;\n    }\n    set targetFPS(fps) {\n        this._targetFPS = fps;\n        this.frameInterval = 1000 / fps;\n    }\n    // --- Image loading ---\n    loadImage(src) {\n        return new Promise((resolve, reject) => {\n            const img = new Image();\n            img.onload = () => {\n                resolve(img);\n            };\n            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));\n            img.src = src;\n        });\n    }\n    // --- Resize ---\n    handleResize() {\n        this.canvas.width = window.innerWidth;\n        this.canvas.height = window.innerHeight;\n    }\n    // --- Animation loop ---\n    startAnimationLoop() {\n        const loop = (timestamp) => {\n            this.animationFrameId = window.requestAnimationFrame(loop);\n            const elapsed = timestamp - this.lastFrameTime;\n            if (elapsed < this.frameInterval)\n                return;\n            // Snap lastFrameTime to a multiple of frameInterval to avoid drift\n            this.lastFrameTime = timestamp - (elapsed % this.frameInterval);\n            const deltaTime = elapsed / 1000; // seconds\n            this.frameCount++;\n            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);\n            for (const cb of this.animationCallbacks) {\n                cb(this.ctx, this.canvas, this.frameCount, deltaTime);\n            }\n        };\n        this.animationFrameId = window.requestAnimationFrame(loop);\n    }\n    stopAnimationLoop() {\n        if (this.animationFrameId !== null) {\n            window.cancelAnimationFrame(this.animationFrameId);\n            this.animationFrameId = null;\n        }\n    }\n    resumeAnimationLoop() {\n        if (this.animationFrameId === null) {\n            this.lastFrameTime = 0;\n            this.startAnimationLoop();\n        }\n    }\n    // --- Callbacks ---\n    addAnimationCallback(cb) {\n        this.animationCallbacks.push(cb);\n    }\n    removeAnimationCallback(cb) {\n        const index = this.animationCallbacks.indexOf(cb);\n        if (index !== -1)\n            this.animationCallbacks.splice(index, 1);\n    }\n    // --- Cleanup ---\n    destroy() {\n        this.stopAnimationLoop();\n        window.removeEventListener('resize', this.handleResize);\n    }\n}\nexports[\"default\"] = CanvasManager;\n\n\n//# sourceURL=webpack://osrs-collection-cards/./src/CanvasManager.ts?\n}");

/***/ },

/***/ "./src/app.ts"
/*!********************!*\
  !*** ./src/app.ts ***!
  \********************/
(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __importDefault = (this && this.__importDefault) || function (mod) {\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst CanvasManager_1 = __importDefault(__webpack_require__(/*! ./CanvasManager */ \"./src/CanvasManager.ts\"));\nwindow.addEventListener('DOMContentLoaded', async () => {\n    const canvasManager = new CanvasManager_1.default('main-canvas');\n    const cardTemplateImg = await canvasManager.loadImage('./images/CardTemplate.png');\n    // Load CardMask.png\n    const maskImg = await canvasManager.loadImage('./images/CardMask.png');\n    // Load Achievement_Diaries.png\n    const achievementImg = await canvasManager.loadImage('./images/Achievement_Diaries.png');\n    canvasManager.addAnimationCallback((ctx, canvas, frame, deltaTime) => {\n        const img = cardTemplateImg;\n        const centerY = canvas.height / 2;\n        // Card positions: center, left, right\n        const numCards = 3;\n        const spacing = Math.min(canvas.width / 4, 350);\n        const baseScale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.35;\n        const cardCenters = [\n            canvas.width / 2,\n            canvas.width / 2 - spacing,\n            canvas.width / 2 + spacing\n        ];\n        for (let i = 0; i < numCards; i++) {\n            const cardX = cardCenters[i];\n            ctx.save();\n            ctx.translate(cardX, centerY);\n            ctx.drawImage(maskImg, -img.width * baseScale / 2, -img.height * baseScale / 2, img.width * baseScale, img.height * baseScale);\n            // Draw achievement image (top middle, behind card, in front of mask)\n            const achWidth = img.width * baseScale * 0.4;\n            const achHeight = achWidth * (achievementImg.height / achievementImg.width);\n            ctx.drawImage(achievementImg, -achWidth / 2, -img.height * baseScale / 2 + 20, achWidth, achHeight);\n            // Draw card image\n            ctx.drawImage(img, -img.width * baseScale / 2, -img.height * baseScale / 2, img.width * baseScale, img.height * baseScale);\n            ctx.restore();\n        }\n    });\n});\n\n\n//# sourceURL=webpack://osrs-collection-cards/./src/app.ts?\n}");

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