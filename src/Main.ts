import {readdirSync, readFileSync, writeFileSync, existsSync} from "fs";

class HeapHandler { 
  private expiration: number = 0;
  private heapRootPath: string | boolean = false;

  private heap: {
    [key: string]: any
  } = [];

  private destructionTimeouts: {
    [key: string]: any
  } = [];

  private scope: {
    [key: string]: any
  } = [];

  public constructor(expiration: number, heapRootPath?: string) {
    this.expiration = expiration;
    if (heapRootPath) {
      this.heapRootPath = heapRootPath;
    }
  }

  public hasInstance(id: string) {
    return Object.keys(this.heap).includes(id);
  }

  public getFromHeap(id: string) {
    //Checking if it's preloaded in memory or if we need to get it from the cold storage
    if (this.hasInstance(id)) {
      return this.heap[id];
    } else if (this.heapRootPath) {
      //Checking if there is an entry for this item in cold storage
      const heapItemPath = `${this.heapRootPath}/${id}.json`;
      if (existsSync(heapItemPath)) {
        //Instantiating the class and reloading it's memory contents
        const coldHeapEntryDetails: HeapItemFormat = JSON.parse(readFileSync(heapItemPath, 'utf8'));
        
        //Instantiating the class
        const instance: HeapItem = new this.scope[coldHeapEntryDetails.class]();
        instance.loadState(coldHeapEntryDetails.memory);

        return instance;
      } else {
        return false;
      }
    }

    return false;
  }

  public insertIntoHeap(id: string, content: any): boolean {
    if (this.hasInstance(id)) throw new Error('Duplicated heap entry ID.');
    this.heap[id] = content;

    this.markActivity(id);
    return this.heap[id];
  }

  public markActivity(id: string): boolean {
    //Just making sure the item is in the scope
    if (this.getFromHeap(id) === false) return false;
    const heapItem = this.heap[id];

    //Saving class memory state
    if (this.heapRootPath && typeof heapItem.saveState === 'function') {
      const heapItemPath = `${this.heapRootPath}/${id}.json`;
  
      //Building payload
      const heapItem = this.getFromHeap(id);
      const payload: HeapItemFormat = {
        class: heapItem.constructor.name,
        memory: heapItem.saveState()
      }
  
      //Writing it to disk
      writeFileSync(heapItemPath, JSON.stringify(payload));
    }

    //Renewing deletion timer
    const instanceDestruction = this.expiration;
    if (instanceDestruction > 0) {
      if (Object.keys(this.destructionTimeouts).includes(id)) {
        clearTimeout(this.destructionTimeouts[id]);
      }  
  
      this.destructionTimeouts[id] = setTimeout(() => {
        //Checking if the heap item has a pre-delete function
        if (typeof heapItem.beforeDelete === 'function') {
          if (heapItem.beforeDelete()) {
            delete this.heap[id];
          } else {
            this.markActivity(id);
          }
        } else {
          delete this.heap[id];
        }
      }, instanceDestruction);
    }

    return true;
  }

  public listColdStorage(): Array<string> | boolean {
    if (this.heapRootPath) {
      return readdirSync(this.heapRootPath as string);
    }

    return false;
  }

  public addToScope(theClass: any): boolean {
    this.scope[theClass.name] = theClass;

    return true;
  }

}

export interface HeapItem {
  saveState(): object,
  loadState(data: object): boolean,
  beforeDelete?(): boolean
}

interface HeapItemFormat {
  class: string,
  memory: any
}

export default HeapHandler;