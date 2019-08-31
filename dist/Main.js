"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var HeapHandler = /** @class */ (function () {
    function HeapHandler(expiration, heapRootPath) {
        this.expiration = 0;
        this.heapRootPath = false;
        this.heap = [];
        this.destructionTimeouts = [];
        this.scope = [];
        this.expiration = expiration;
        if (heapRootPath) {
            this.heapRootPath = heapRootPath;
        }
    }
    HeapHandler.prototype.hasInstance = function (id) {
        return Object.keys(this.heap).includes(id);
    };
    HeapHandler.prototype.getFromHeap = function (id) {
        //Checking if it's preloaded in memory or if we need to get it from the cold storage
        if (this.hasInstance(id)) {
            return this.heap[id];
        }
        else if (this.heapRootPath) {
            //Checking if there is an entry for this item in cold storage
            var heapItemPath = this.heapRootPath + "/" + id + ".json";
            if (fs_1.existsSync(heapItemPath)) {
                //Instantiating the class and reloading it's memory contents
                var coldHeapEntryDetails = JSON.parse(fs_1.readFileSync(heapItemPath, 'utf8'));
                //Instantiating the class
                var instance = new this.scope[coldHeapEntryDetails.class]();
                instance.loadState(coldHeapEntryDetails.memory);
                return instance;
            }
            else {
                return false;
            }
        }
        return false;
    };
    HeapHandler.prototype.insertIntoHeap = function (id, content) {
        if (this.hasInstance(id))
            throw new Error('Duplicated heap entry ID.');
        this.heap[id] = content;
        this.markActivity(id);
        return this.heap[id];
    };
    HeapHandler.prototype.markActivity = function (id) {
        var _this = this;
        //Just making sure the item is in the scope
        if (this.getFromHeap(id) === false)
            return false;
        var heapItem = this.heap[id];
        //Saving class memory state
        if (this.heapRootPath && typeof heapItem.saveState === 'function') {
            var heapItemPath = this.heapRootPath + "/" + id + ".json";
            //Building payload
            var heapItem_1 = this.getFromHeap(id);
            var payload = {
                class: heapItem_1.constructor.name,
                memory: heapItem_1.saveState()
            };
            //Writing it to disk
            fs_1.writeFileSync(heapItemPath, JSON.stringify(payload));
        }
        //Renewing deletion timer
        var instanceDestruction = this.expiration;
        if (instanceDestruction > 0) {
            if (Object.keys(this.destructionTimeouts).includes(id)) {
                clearTimeout(this.destructionTimeouts[id]);
            }
            this.destructionTimeouts[id] = setTimeout(function () {
                //Checking if the heap item has a pre-delete function
                if (typeof heapItem.beforeDelete === 'function') {
                    if (heapItem.beforeDelete()) {
                        delete _this.heap[id];
                    }
                    else {
                        _this.markActivity(id);
                    }
                }
                else {
                    delete _this.heap[id];
                }
            }, instanceDestruction);
        }
        return true;
    };
    HeapHandler.prototype.listColdStorage = function () {
        if (this.heapRootPath) {
            return fs_1.readdirSync(this.heapRootPath);
        }
        return false;
    };
    HeapHandler.prototype.addToScope = function (theClass) {
        this.scope[theClass.name] = theClass;
        return true;
    };
    return HeapHandler;
}());
exports.default = HeapHandler;
