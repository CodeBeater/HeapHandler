declare class HeapHandler {
    private expiration;
    private heapRootPath;
    private heap;
    private destructionTimeouts;
    private scope;
    constructor(expiration: number, heapRootPath?: string);
    hasInstance(id: string): boolean;
    getFromHeap(id: string): any;
    insertIntoHeap(id: string, content: any): boolean;
    markActivity(id: string): boolean;
    listColdStorage(): Array<string> | boolean;
    addToScope(theClass: any): boolean;
}
export interface HeapItem {
    saveState(): object;
    loadState(data: object): boolean;
    beforeDelete?(): boolean;
}
export default HeapHandler;
