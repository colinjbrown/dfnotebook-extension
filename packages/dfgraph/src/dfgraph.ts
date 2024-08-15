import { DepView } from './depview';
import { Minimap } from './minimap';
// @ts-ignore
import * as Hashes from 'jshashes';

//UUID length has been changed need to compensate for that
const uuidLength = 8;

// @ts-ignore
declare global {
  interface Array<T> {
    setAdd(item: T): Array<T>;
  }
}

var SHA1 = new Hashes.SHA1;

/** @method this is a set addition method for dependencies */
// @ts-ignore
Array.prototype.setAdd = function (item) {
  let that = this;
  if (that.indexOf(item) < 0) {
    that.push(item);
  }
};

class GraphManager {
  public graphs: { [index: string]: any };
  currentGraph: string;
  depview: any;
  minimap: any;
  depWidget: any;
  miniWidget: any;
  activeID: string;
  tracker: any;
  previousActive: string;

  constructor(graphs?: {}) {
    this.graphs = graphs || {};
    this.currentGraph = 'None';
    this.depview = new DepView();
    this.minimap = new Minimap();
    this.previousActive = 'None';
  }

  getProperty = function (prop: string) {
    if (prop in this.graphs) {
      // @ts-ignore
      return this.graphs[prop];
    }
    return '';
  };

  setTracker = function (tracker: any) {
    this.tracker = tracker;
    this.minimap.setTracker(this.tracker);
    this.depview.setTracker(this.tracker);
  };

  /** @method updates the activate graph and calls the update views method */
  updateGraph = function (graph: string) {
    if (graph == 'None') {
      return;
    }
    this.currentGraph = graph;
    this.graphs[this.currentGraph].setManager(this);
    this.depview.dfgraph = this.graphs[graph];
    this.minimap.setGraph(this.graphs[graph]);
    this.updateDepViews(true);
  };

  updateActive = function (activeid?: string, prevActive?: any) {
    this.activeID = activeid || 'none';
    this.previousActive = prevActive || 'none';
    //FIXME: Add depviewer active cell code
    //         if(this.depWidget.is_open){
    //             console.log("Update dep viewer here");
    //         }
    if (this.miniWidget.isOpen) {
      this.minimap.updateActiveByID(activeid);
    }
  };

  /** @method attempt to update the active graph using the tracker this is not preferred **/
  updateActiveGraph = function () {
    this.currentGraph =
      this.tracker.currentWidget.sessionContext.session?.id || 'None';
    this.depview.dfgraph = this.graphs[this.currentGraph];
    this.minimap.setGraph(this.graphs[this.currentGraph]);
    this.updateDepViews(true, false, true);
  };

  markStale = function (uuid: string) {
    this.updateActiveGraph();
    if (!(this.currentGraph in this.graphs)) {
      return;
    }
    this.graphs[this.currentGraph].updateStale(uuid);
    if (this.miniWidget.isOpen) {
        this.minimap.updateStates();
    }
  };

  revertStale = function (uuid: string) {
    this.graphs[this.currentGraph].updateFresh(uuid, true);
    if(this.miniWidget.isOpen){
        this.minimap.updateStates();
    }
  };

  getStale = function (uuid: string) {
    return this.graphs[this.currentGraph].states[uuid];
  };

  getActive = function () {
    return this.previousActive;
  };

  getText = function (uuid: string) {
    this.updateActiveGraph();
    if (!(this.currentGraph in this.graphs)) {
      return '';
    }
    return this.graphs[this.currentGraph].cellContents[uuid];
  };

  recordCells = function (panel:any) {
    this.graphs[this.currentGraph].recordCells(panel);
  }


  moveVersion = function (up:boolean){
    this.graphs[this.currentGraph].moveVersion(up);
    return;
  }

  updateOrder = function (neworder: any) {
    this.updateActiveGraph();
    if (!(this.currentGraph in this.graphs)) {
      return;
    }
    this.graphs[this.currentGraph].updateOrder(neworder);
    let modifiedorder = neworder.map(
      (cellid: any) => cellid.replace(/-/g, '').substr(0, 8) as string
    );
    this.minimap.updateOrder(modifiedorder);
    this.depview.updateOrder(modifiedorder,true);
    this.updateDepViews(true, true);
  };

  // Utility function to create an empty graph in case one doesn't exist
  createGraph = function (sess:string){
    this.graphs[sess] = new Graph();
    this.graphs[sess].setManager(this);
  }

  /** @method updates all viewers based on if they're open or not */
  // view flag is based on if it's a new view or the same view
  updateDepViews = function (
    newView: boolean,
    mini: boolean = false,
    mini2: boolean = false
  ) {
    if (this.miniWidget.isOpen) {
      if (mini2) {
        return;
      }
      if (newView) {
        this.minimap.clearMinimap();
      }
      this.minimap.startMinimapCreation();
    }
    if (this.depWidget.isOpen && !mini) {
      if (newView) {
        this.depview.startGraphCreation();
      } else {
        let g = this.depview.createNodeRelations(
          this.depview.globaldf,
          this.depview.globalselect
        );
        this.depview.createGraph(g);
      }
    }
  };
}

export class Graph {
  upstreamList: {};
  wasChanged: boolean;
  cells: any;
  nodes: any;
  uplinks: any;
  downlinks: any;
  internalNodes: any;
  downstreamLists: any;
  depview: any;
  minimap: any;
  graphManager: any;
  cellContents: any;
  cellOrder: any;
  states: any;
  executed: any;
  currVer: any;
  verIdx: number;
  historySequence: any;
  sequence: any;
  panel: any;
  
  cellOrderHistory: any;
  cellContentsHistory: any;
  downlinksHistory: any;
  internalNodesHistory: any;
  //statesHistory: any;
  uplinksHistory: any;
  nodesHistory: any;
  cellsHistory: any;
  upstreamListHistory: any;
  rawCellsHistory: any;
  // executedHistory: any;

  /*
   * Create a graph to contain all inner cell dependencies
   */
  constructor(
    {
      cells = [],
      nodes = [],
      uplinks = {},
      downlinks = {},
      internalNodes = {},
      allDown = {},
      cellContents = {}
    }: {
      cells?: string[];
      nodes?: string[];
      uplinks?: {};
      downlinks?: {};
      internalNodes?: {};
      allDown?: {};
      cellContents?: {};
    } = {},
    states?: {}
  ) {
    let that = this;
    this.wasChanged = false;
    this.cells = cells || [];
    this.cellsHistory = {};
    this.cellOrderHistory = {};
    this.cellContentsHistory = {};
    this.internalNodesHistory = {};
    this.nodesHistory = {};
    this.uplinksHistory = {};
    this.downlinksHistory = {};
    this.upstreamListHistory = {};
    this.rawCellsHistory = [];
    this.currVer = {};
    this.verIdx = 0;
    this.nodes = nodes || [];
    this.uplinks = uplinks || {};
    this.downlinks = downlinks || {};
    this.internalNodes = internalNodes || {};
    this.cellContents = cellContents || {};
    this.cellOrder = [];
    this.historySequence = [];
    this.sequence = {};
    

    //Cache downstream lists
    this.downstreamLists = allDown || {};
    this.upstreamList = {};
    this.states = states || {};
    this.executed = {};
    if (that.cells.length > 1) {
      that.cells.forEach(function (uuid: string) {
        that.states[uuid] = 'Stale';
        that.executed[uuid] = false;
      });
    }
  }

  /** @method calculateSha creates a sha out of nested objects */
  calculateSha = function(object: any){
    return (SHA1.hex(JSON.stringify(object)));
  }


  setManager = function (manager:any) {
    this.graphManager = manager;
  }

  /** @method updateStale updates the stale states in the graph */
  updateStale(uuid: string) {
    this.states[uuid] = 'Changed';
    if (uuid in this.downlinks) {
      this.allDownstream(uuid).forEach(
        (duuid: string) => (this.states[duuid] = 'Upstream Stale')
      );
    }
  }

  /** @method getText **/
  getText = function (uuid: string) {
    if (uuid in this.cellContents) {
      return this.cellContents[uuid];
    }
    return '';
  };

  /** @method updateFresh updates the stale states in the graph */
  updateFresh(uuid: string, revert: boolean) {
    let that = this;
    //Make sure that we don't mark non executed cells as fresh
    if (revert && !that.executed[uuid]) {
      return;
    }
    that.states[uuid] = 'Fresh';
    that.executed[uuid] = true;
    //We have to execute upstreams either way
    console.log(that.uplinks[uuid]);
    Object.keys(that.uplinks[uuid]).forEach(function (upuuid: string) {
      that.states[upuuid] = 'Fresh';
    });

    if (revert == true) {
      //Restore downstream statuses
      that.allDownstream(uuid).forEach(function (duuid: string) {
        if (
          that.upstreamFresh(duuid) &&
          that.states[duuid] == 'Upstream Stale'
        ) {
          that.states[duuid] = 'Fresh';
        }
      });
    }
  }

  /** @method upstreamFresh checks to see if everything upstream from a cell is fresh or not */
  upstreamFresh(uuid: string) {
    let that = this;
    return Object.keys(that.getAllUpstreams(uuid)).reduce(function (
      flag: boolean,
      upuuid: string
    ) {
      return flag && that.states[upuuid] == 'Fresh';
    }, true);
  }

  recordCells = function(panel:any){
    this.panel = panel;
    //this.rawCellsHistory.push(panel.widgets);
  }


  /** @method updateGraph */
  updateGraph(
    this: Graph,
    cells: any,
    nodes: never[],
    uplinks: any,
    downlinks: never[],
    uuid: string,
    allUps: any,
    internalNodes: any
  ) {
    let that: Graph = this;
    //         if(that.depview.isOpen === false){
    //             that.wasChanged = true;
    //         }
    //let histSeq : {[key:string]:string} = {};
    


    let oldCells = that.calculateSha(that.cells);
    let newCells = that.calculateSha(cells);
    this.sequence['cells'] = oldCells;
    this.currVer['cells'] = newCells;

    if(oldCells != newCells){
      that.cellsHistory[oldCells] = that.cells;
    }
    that.cellsHistory[newCells] = cells;
    that.cells = cells;

    let oldNodes = that.calculateSha(that.nodes);
    this.sequence['nodes'] = oldNodes;
    that.nodesHistory[oldNodes] = structuredClone(that.nodes);
    that.nodes[uuid] = nodes || [];
    let newNodes = that.calculateSha(that.nodes);
    this.currVer['nodes'] = newNodes;
    if(oldNodes != newNodes){
      that.nodesHistory[newNodes] = that.nodes;
    }

    let oldUplinks = that.calculateSha(that.uplinks);
    this.sequence['links'] = oldUplinks;
    that.uplinksHistory[oldUplinks] = structuredClone(that.uplinks);
    that.downlinksHistory[oldUplinks] = structuredClone(that.downlinks);

    if (uuid in that.uplinks) {
      Object.keys(that.uplinks[uuid]).forEach(function (uplink) {
        that.downlinks[uplink] = [];
      });
    }

    that.uplinks[uuid] = uplinks;

    that.downlinks[uuid] = downlinks || [];

    let newUplinks = that.calculateSha(that.uplinks);

    that.currVer['links'] = newUplinks;
    
    if (oldUplinks != newUplinks){
      that.uplinksHistory[newUplinks] = structuredClone(that.uplinks);
      that.downlinksHistory[newUplinks] = structuredClone(that.downlinks);
    }
    
    var oldInt = that.calculateSha(that.internalNodes);
    that.internalNodesHistory[oldInt] = structuredClone(that.internalNodes);
    that.internalNodes[uuid] = internalNodes;
    var newInt = that.calculateSha(that.internalNodes);
    if(oldInt != newInt){
      that.internalNodesHistory[newInt] = structuredClone(that.internalNodes);
    }
    that.sequence['internals'] = oldInt;
    that.currVer['internals'] = newInt;
    //Contains logic for updating dependency lists
    var oldUps = that.calculateSha(that.upstreamList);
    this.sequence['upslist'] = oldUps;
    that.cellsHistory[oldUps] = that.upstreamList;
    that.updateDepLists(allUps, uuid);
    var newUps = that.calculateSha(that.upstreamList);
    that.currVer['upslist'] = newUps;
    if(oldUps != newUps){
      that.upstreamListHistory[newUps] = that.upstreamList;
    }
    

    that.updateFresh(uuid, false);
    //Shouldn't need the old way of referencing
    //that.minimap.updateEdges();
    //celltoolbar.CellToolbar.rebuildAll();
    this.historySequence.push(this.sequence);
    this.verIdx = this.historySequence.length - 1;
    this.sequence = {};
    //let rawCells = that.graphManager.tracker.currentWidget.content.cellsArray.map((cell) => cell.node);
    //let rawSha = that.calculateSha(rawCells);
    //that.currVer['rawcells'] = rawSha;
//    this.rawCellsHistory.push(structuredClone(this.graphManager.tracker.currentWidget.content.cellsArray));//.map((cell:any) => cell.node));
    
    this.rawCellsHistory.push(this.panel.node.childNodes[1].childNodes[0].children[0].cloneNode(true));
    this.logHistories();
  }

  moveVersion = function(up:Boolean){
    console.log("Moving Version");
    if(up && this.verIdx < (this.historySequence.length-1)){
      this.changeVersion(this.verIdx+1);
    }
    else if(this.verIdx >= 1){
      this.changeVersion(this.verIdx-1);
    }

  }

  changeVersion = function(history:number){
    console.log("Changing Version");
    if(history != this.historySequence.length && JSON.stringify(this.currVer) != JSON.stringify(this.historySequence[this.historySequence.length - 1])){
      this.historySequence.push(this.currVer);
    }
    let hist = this.historySequence[history];
    this.verIdx = history;
    this.upstreams = this.upstreamListHistory[hist['upslist']];
    this.uplinks = this.uplinksHistory[hist['links']];
    this.downlinks = this.downlinksHistory[hist['links']];
    this.cells = this.cellsHistory[hist['cells']];
    this.nodes = this.nodesHistory[hist['nodes']];
    this.cellContents = this.cellContentsHistory[hist['content']];
    console.log(this.graphManager.tracker);
    //this.panel.widgets = this.rawCellsHistory[history-1];
    console.log(document.getElementsByClassName('jp-WindowedPanel-viewport'));
    console.log(this.rawCellsHistory[history-1]);
    console.log(this.rawCellsHistory);
    let viewport = document.getElementsByClassName('jp-WindowedPanel-viewport')[0];
    viewport.replaceChildren('');
    viewport.innerHTML = this.rawCellsHistory[history-1].innerHTML;
    // for (let i = 0; i < this.rawCellsHistory[history-1].children.length; i++){
    //   let ele = this.rawCellsHistory[history-1].children.item(i).cloneNode();
    //   viewport.appendChild(ele);
    // }
//    this.rawCellsHistory[history-1].children.map((node:any) => viewport.appendChild(node));
    //document.getElementsByClassName('jp-WindowedPanel-viewport')[0].replaceChildren(this.rawCellsHistory[history-1]);
    //this.panel.node.childNodes[1].childNodes[0].children[0].children = this.rawCellsHistory[history-1];
    //this.graphManager.tracker.currentWidget.content.cellsArray = this.rawCellsHistory[history-1];
    //this.graphManager.tracker.currentWidget.content._viewport.childNodes = this.rawCellsHistory[history-1];
    this.graphManager.updateDepViews(true);

  }

  logHistories = function(){
    console.log(this.upstreamListHistory);
    console.log(this.uplinksHistory);
    console.log(this.downlinksHistory);
    console.log(this.cellsHistory);
    console.log(this.nodesHistory);
    console.log(this.cellContentsHistory);
    console.log(this.historySequence);
    console.log(this.rawCellsHistory);
    //console.log(changeVersion);
  }

  updateOrder = function (neworder: any) {
    //console.log(neworder);
    let oldOrder = this.calculateSha(this.cellOrder);
    this.sequence['order'] = oldOrder;
    let newOrder = this.calculateSha(neworder);
    this.currVer['order'] = newOrder;
    this.cellOrderHistory[oldOrder] = structuredClone(this.order);
    this.cellOrder = neworder;
    if(oldOrder != newOrder){
      this.cellOrderHistory[newOrder] = structuredClone(this.order);
    }
  };

  /** @method removes a cell entirely from the graph **/
  removeCell = function (this: Graph, uuid: string) {
    let that: Graph = this;
    let cellIndex = that.cells.indexOf(uuid);
    if (cellIndex > -1) {
      that.cells.splice(cellIndex, 1);
      delete that.nodes[uuid];
      delete that.internalNodes[uuid];
      delete that.downstreamLists[uuid];
      (that.downlinks[uuid] || []).forEach(function (down: any) {
        if (down in that.uplinks && uuid in that.uplinks[down]) {
          delete that.uplinks[down][uuid];
        }
      });
      delete that.downlinks[uuid];
      if (uuid in that.uplinks) {
        let uplinks = Object.keys(that.uplinks[uuid]);
        uplinks.forEach(function (up: any) {
          let idx = that.downlinks[up].indexOf(uuid);
          that.downlinks[up].splice(idx, 1);
        });
      }
      delete that.uplinks[uuid];
      if (uuid in that.upstreamList) {
        // @ts-ignore
        let allUps = that.upstreamList[uuid].slice(0);
        // @ts-ignore
        delete that.upstreamList[uuid];
        allUps.forEach(function (up: any) {
          //Better to just invalidate the cached list so you don't have to worry about downstreams too
          delete that.downstreamLists[up];
        });
      }
    }
  };

  /** @method setInternalNodes */
  setInternalNodes = function (
    this: Graph,
    uuid: string | number,
    internalNodes: any
  ) {
    this.internalNodes[uuid] = internalNodes;
  };

  /** @method recursively yield all downstream deps */
  allDownstream(this: Graph, uuid: string | number) {
    let that: Graph = this;
    let visited: Array<string> = []; // Array<string> = [];
    let res: Array<string> = []; //: Array<string> = [];
    let downlinks = (this.downlinks[uuid] || []).slice(0);
    while (downlinks.length > 0) {
      let cid = downlinks.pop();
      visited.setAdd(cid);
      res.setAdd(cid);
      if (cid in that.downstreamLists) {
        that.downstreamLists[cid].forEach(function (pid: string) {
          res.setAdd(pid);
          visited.setAdd(pid);
        });
      } else {
        if (cid in that.downlinks) {
          that.downlinks[cid].forEach(function (pid: string) {
            if (visited.indexOf(pid) < 0) {
              downlinks.push(pid);
            }
          });
        } else {
          let idx = res.indexOf(cid);
          res.splice(idx, 1);
        }
      }
    }
    that.downstreamLists[uuid] = res;
    return res;
  }

  allUpstreamCellIds(cid: any) {
    let uplinks = this.getImmUpstreams(cid);
    let allCids: Array<string> = [];
    while (uplinks.length > 0) {
      let upCid = uplinks.pop() || '';
      allCids.setAdd(upCid);
      uplinks = uplinks.concat(this.getImmUpstreams(upCid));
    }
    return allCids;
  }

  /** @method updates all downstream links with downstream updates passed from kernel */
  updateDownLinks(this: Graph, downupdates: any[]) {
    let that: Graph = this;
    downupdates.forEach(function (t) {
      let uuid = t['key'].substr(0, uuidLength);
      that.downlinks[uuid] = t['data'];
      if (uuid in that.cellContents && t.data) {
        that.downlinks[uuid] = t['data'];
      }
    });
    that.downstreamLists = {};
  }

  /** @method updateCodeDict */
  updateCellContents(this: Graph, cellContents: any) {
    let oldContent = this.calculateSha(this.cellContents);
    this.sequence['content'] = oldContent;
    //this.historySequence[this.historySequence.length - 1]['content'] = oldContent;
    let newContent = this.calculateSha(cellContents);
    this.currVer['content'] = newContent;
    if (oldContent != newContent){
      this.cellContentsHistory[oldContent] = structuredClone(this.cellContents);
    }
    this.cellContentsHistory[newContent] = structuredClone(cellContents);
    this.cellContents = cellContents;
  }

  /** @method updateDepLists */
  updateDepLists(this: Graph, allUps: string | any[], uuid: string | number) {
    let that: Graph = this;
    //     let cell = Jupyter.notebook.getCodeCell(uuid);
    //
    //     if(cell.last_msg_id){
    //         cell.clear_df_info();
    //     }
    //
    //     if(that.downlinks[uuid].length > 0){
    //         cell.updateDfList(cell,that.allDownstream(uuid),'downstream');
    //     }
    //
    if (allUps == undefined){ return; }

    if (allUps.length > 0) {
      // @ts-ignore
      that.upstreamList[uuid] = allUps;
      //        cell.updateDfList(cell,allUps,'upstream');
    }
  }

  /** @method returns the cached all upstreams for a cell with a given uuid */
  getAllUpstreams(uuid: string | number) {
    // @ts-ignore
    return this.upstreamList[uuid];
  }

  /** @method returns upstreams for a cell with a given uuid */
  getUpstreams(this: Graph, uuid: string | number) {
    let that: Graph = this;
    return Object.keys(that.uplinks[uuid] || []).reduce(function (arr, uplink) {
      let links =
        that.uplinks[uuid][uplink].map(function (item: string) {
          return uplink === item ? item : uplink + item;
        }) || [];
      return arr.concat(links);
    }, []);
  }

  /** @method returns single cell based upstreams for a cell with a given uuid */
  getImmUpstreams(uuid: string | undefined) {
    // @ts-ignore
    if (uuid in this.uplinks) {
      // @ts-ignore
      return Object.keys(this.uplinks[uuid]);
    }
    return [];
  }

  getImmUpstreamNames(this: Graph, uuid: string | number | undefined) {
    let arr: never[] = [];
    let that: Graph = this;
    // @ts-ignore
    this.getImmUpstreams(uuid).forEach(function (upUuid) {
      // @ts-ignore
      Array.prototype.push.apply(arr, that.uplinks[uuid][upUuid]);
    });
    return arr;
  }

  getImmUpstreamPairs(uuid: string | number | undefined) {
    let arr: never[] = [];
    let that: Graph = this;
    if (uuid !== undefined) {
      this.getImmUpstreams(uuid.toString()).forEach(function (upUuid) {
        Array.prototype.push.apply(
          arr,
          that.uplinks[uuid][upUuid].map(function (v : any) {
            return [v, upUuid];
          })
        );
      });
    }
    return arr;
  }

  /** @method returns downstreams for a cell with a given uuid */
  getDownstreams(uuid: string | number) {
    return this.downlinks[uuid];
  }

  /** @method returns the cached all upstreams for a cell with a given uuid */
  getInternalNodes(uuid: string | number) {
    return this.internalNodes[uuid] || [];
  }

  /** @method returns all nodes for a cell*/
  getNodes(this: Graph, uuid: string) {
    let that: Graph = this;
    if (uuid in that.nodes) {
      if ((that.nodes[uuid] || []).length > 0) {
        return that.nodes[uuid];
      }
    }
    return [];
  }

  /** @method returns all cells on kernel side*/
  getCells = function (this: Graph) {
    return this.cells;
  };
}

export const Manager = new GraphManager();
