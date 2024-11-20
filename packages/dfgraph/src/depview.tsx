import * as d3 from 'd3';
import $ from 'jquery';
import '@hpcc-js/wasm';
import Writer from 'graphlib-dot';
import { graphviz, GraphvizOptions } from 'd3-graphviz';
//import * as GraphLib from 'graphlib';
import React from 'react';
import { useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  ReactFlow,
  MiniMap,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import DepNode from './DepNode';


const edgeType = 'default';
const nodeWidth = 80;
const nodeHeight = 36;
const nodeTypes = {
    depNode: DepNode,
};



//UUID length has been changed need to compensate for that
const uuidLength = 8;


const defaultOptions: GraphvizOptions = {
  height: 1600,
  width: 1600,
  scale: 1,
  tweenPrecision: 1,
  engine: 'dot',
  keyMode: 'title',
  convertEqualSidedPolygons: false,
  fade: false,
  growEnteringEdges: false,
  fit: true,
  tweenPaths: false,
  tweenShapes: false,
  useWorker: false,
  zoom: true
};

export class DepView {
  isCreated: boolean;
  isOpen: boolean;
  dataflow: boolean;
  selected: boolean;
  doneRendering: boolean;
  debugMode: boolean;
  parentdiv: any;
  sidePanel: any;
  nodespanel: any;
  tabular: any;
  executePanel: any;
  labelstyles: string;
  cellLabel: string;
  cellLinks: any[];
  cellList: any[];
  cellChildNums: any[];
  outputNodes: any[];
  activeCell: string;
  dfgraph: any;
  dotgraph: any[];
  depdiv: any;
  svg: any;
  widget: any;
  tracker: any;
  order: any;
  graphtran: any;

  constructor(dfgraph?: any, parentdiv?: any, labelstyles?: string) {
    //Flags
    this.isOpen = false;
    this.dataflow = true;
    this.selected = false;
    this.doneRendering = false;
    this.isCreated = false;

    //Turn on console logs
    this.debugMode = false;

    //Divs and Div related variables
    this.parentdiv = parentdiv || 'div#depview';
    this.depdiv = null;
    this.sidePanel = null;
    this.nodespanel = null;
    this.svg = null;
    this.tabular = null;
    this.executePanel = null;
    //Label Styles should be set in text so that GraphViz can properly size the nodes
    this.labelstyles =
      labelstyles ||
      'font-family: monospace; fill: #D84315; font-size: 0.85em;';

    //Divs are created and defined in here
    //this.createDepDiv();

    //This has been largely factored out but this provides the option to change the label of a cell
    this.cellLabel = '';

    this.cellLinks = [];
    this.order = [];
    this.cellList = [];
    this.cellChildNums = [];
    this.outputNodes = [];
    this.activeCell = '';

    this.dfgraph = dfgraph;
    this.graphtran = null;
    //console.log(NotebookTools);

    this.dotgraph = [];

    //this.bind_events();
  }
  //
  //         /** @method bind_events */
  //FIXME: Figure out Jupyter.notebook equivalent here
  //     bind_events = function () {
  //         var that = this;
  //         var nb = Jupyter.notebook;
  //
  //         nb.events.on('create.Cell', function(evt,cell) {
  //             if(that.is_open){
  //                 that.update_cell_lists();
  //             }
  //         });
  //         nb.events.on('select.Cell', function(){
  //             var cell = Jupyter.notebook.get_selected_cell();
  //            if(cell.cell_type === 'code' && that.is_open){
  //                that.set_details(cell.uuid);
  //            }
  //         });
  //         nb.events.on('delete.Cell',function (evt,cell) {
  //             if(that.is_open){
  //                 that.decorate_cell(cell.cell.uuid,'deleted-cell',true);
  //             }
  //         });
  //     };
  //
  /** @method closes the depviewer **/
  closeDiv = function () {
    this.isOpen = false;
    this.depdiv.style.display = 'none';
    d3.select(this.parentdiv).transition().delay(100).style('height', '0vh');
    d3.select('.end_space').transition().delay(100).style('height', '0vh');
  };

  updateOrder = function (order: any, active: Boolean) {
    let old_order = this.order.slice();
    this.order = order;
    
    if(active && this.is_open && this.arraysEqual(old_order,this.order)){
        this.startGraphCreation();
    }
  };

  //Taken from https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
  arraysEqual = function (a:any, b:any) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
  
    let bcopy = b.slice();
    a.sort();
    bcopy.sort();
   
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== bcopy[i]) return false;
    }
    return true;
  }


  //
  //     /** @method closes the depviewer and scrolls to the currently selected cell **/
  //     close_and_scroll = function () {
  //       var that = this;
  //       if(that.active_cell && that.active_cell !== ''){
  //           that.close_div();
  //           Jupyter.notebook.select_by_id(that.active_cell);
  //           Jupyter.notebook.scroll_to_cell_id(that.active_cell);
  //           return;
  //       }
  //       that.close_div();
  //     };
  //
  //
  setTracker = function (tracker: any) {
    this.tracker = tracker;
    console.log(tracker);
  };

  /** @method creates dependency div*/
  createDepDiv = function () {
    let that = this;

    this.depdiv = document.createElement('div');
    this.depdiv.setAttribute('class', 'dep-div container');
    $(this.parentdiv).append(this.depdiv);

    this.sidePanel = d3
      .select('div.dep-div')
      .append('div')
      .attr('id', 'side-panel');

    this.tabular = this.sidePanel
      .append('div')
      .attr('id', 'table')
      .classed('card', true);
    //        this.tabular.append('h3').text("Graph Overview").classed('card-header', true).classed('primary-color', true).classed('white-text', true).classed('cell-list-header', true).attr('id', 'overview-header');

    //         let newdiv = this.tabular.append('div').classed('table-div',true);
    //         newdiv.append('h4').text('New Cells').classed('card-header', true).classed('primary-color', true).classed('white-text', true).classed('cell-list-header', true);
    //         newdiv.append('div').classed('card-body', true).attr('id', 'newlist').append('ul').classed('list-group', true).classed('list-group-flush', true);
    //
    //         let changediv = this.tabular.append('div').classed('table-div',true);
    //         changediv.append('h4').text('Changed Cells').classed('card-header', true).classed('primary-color', true).classed('white-text', true).classed('cell-list-header', true);
    //         changediv.append('div').classed('card-body', true).attr('id', 'changedlist').append('ul').classed('list-group', true).classed('list-group-flush', true);

    this.tabular
      .append('a')
      .text('⤓ Dot')
      .attr('id', 'dot-dl')
      .classed('btnviz', true)
      .classed('btnviz-primary', true)
      .classed('fa', true); //.classed('btnviz', true).classed('btnviz-outline-primary', true).classed('btnviz-rounded waves-effect', true);

    this.tabular
      .append('a')
      .text('Toggle Sink Cells')
      .attr('id', 'out-toggle')
      .classed('btnviz', true)
      .classed('btnviz-primary', true)
      .classed('fa', true) //.classed('btnviz', true).classed('btnviz-outline-primary', true).classed('btnviz-rounded waves-effect', true)
      .on('click', function () {
        that.dataflow = !that.dataflow;
        that.startGraphCreation();
      });

    //FIXME: This is where the Graph Summary button goes
    //this.tabular.append('a').text('Show Graph Summary').attr('id', 'graphsum').classed('btnviz', true).classed('btnviz-outline-primary', true).classed('btnviz-rounded waves-effect', true);

    //        this.executepanel = this.side_panel.append('div').attr('id', 'cell-detail').classed('card', true).style('background-color', 'white');
    //        this.executepanel.append('h3').text("Cell Overview").classed('card-header', true).classed('primary-color', true).classed('white-text', true).classed('cell-list-header', true).attr('id', 'overview-header');

    this.tabular
      .append('span')
      .text('Cell Local Variables:')
      .classed('locals', true); //.classed('card-title', true);
    this.tabular
      .data(['None'])
      .append('span')
      .text('None')
      .classed('badge-pill', true)
      .classed('badge-danger', true);
    //         this.nodespanel = this.executepanel.append('div').attr('id', 'nodes-panel');
    //         this.nodespanel.append('h4').text("Cell Local Variables:").classed('card-title', true);
    //         this.nodespanel.data(["None"]).append('span').text('None').classed('badge-pill', true).classed('badge-danger', true);

    //let executeactions = this.executepanel.append('div').attr('id','exec-actions');
    //FIME:FIX THIS
    // executeactions.append('a').text("  Execute Cell").classed('btnviz', true).classed('btnviz-primary', true).attr('id', 'exec-button').classed('fa-step-forward', true).classed('fa', true).on('click',function(){
    //     var cell = Jupyter.notebook.get_selected_cell();
    //     cell.execute();
    // });
    //executeactions.append('a').text("Close and Go to Cell").attr('id', 'close-scroll').classed('btnviz', true).classed('btnviz-primary', true).classed('fa', true).on('click', function () {that.close_and_scroll();});

    this.svg = d3
      .select('div.dep-div')
      .append('div')
      .attr('id', 'svg-div')
      .on('contextmenu', function () {
        return false;
      });
    this.isCreated = true;
  };

  /** @method upon a new cell selection will change the details of the viewer **/
  setDetails = function (cellid: string) {
    let that = this;
    $('#' + that.activeCell + 'cluster')
      .find('polygon')
      .toggleClass('selected', false);
    that.activeCell = cellid;
    d3.select('#select-identifier').remove();
    if (that.dfgraph.getCells().indexOf(that.activeCell) > -1) {
      // @ts-ignore
      let rectPoints = $('#' + that.activeCell + 'cluster')
        .find('polygon')
        .attr('points')
        .split(' ');
      let rectTop = rectPoints[1].split(',') as any;
      let height = Math.abs(rectTop[1] - Number(rectPoints[0].split(',')[1]));
      d3.select('#svg-div svg g')
        .insert('g', '#a_graph0 + *')
        .attr('id', 'select-identifier')
        .append('rect')
        .attr('x', parseInt(rectTop[0]) - 3)
        .attr('y', parseInt(rectTop[1]))
        .attr('height', height)
        .attr('width', '3px');
    }
    //FIXME: Find equivalent in Lab
    //console.log(NotebookTools);
    //const cell = panel.content.widgets[index];
    //cell.node.scrollIntoView();

    //Jupyter.notebook.select_by_id(that.active_cell);
    //Jupyter.notebook.scroll_to_cell_id(that.active_cell);
    this.tracker.currentWidget.content.activeCellIndex =
      this.order.indexOf(cellid);

    $('#' + cellid + 'cluster')
      .find('polygon')
      .toggleClass('selected', true);
    d3.select('#table').selectAll('.badge-pill').remove();
    let intNodes = that.dfgraph.getInternalNodes(cellid);
    if (intNodes.length < 1) {
      intNodes = ['None'];
    }
    d3.select('#table')
      .selectAll('span.badge')
      .data(intNodes)
      .enter()
      .append('span')
      .text(function (d: any) {
        return d;
      })
      .attr('class', function (d: any) {
        let baseclasses = 'badge badge-pill ';
        if (d === 'None') {
          return baseclasses + 'badge-danger';
        }
        return baseclasses + 'badge-primary';
      });
  };

  /** @method updates the new and changed cell lists **/
  updateCellLists = function () {
    let that = this;
    //let new_cells: string[] = [];
    //let changed_cells: string[] = [];

    //Goes with code below
    //var cells = that.dfgraph.get_cells();

    //FIXME: Find Jupyter Equivalent
    // Jupyter.notebook.get_cells().map(function(cell){
    //     if(cell.cell_type === 'code'){
    //         if(cells.indexOf(cell.uuid) > -1){
    //             if(cell.metadata.cell_status.substr(0,'edited'.length) === 'edited'){
    //                 changed_cells.push(cell.uuid);
    //             }
    //         }
    //         else{
    //             new_cells.push(cell.uuid);
    //         }
    //     }
    // });

    // TODO: REMOVE THIS FUNCTIONALITY, REVISIT AT SOME POINT?
    //             let new_list = d3.select('#newlist').select('ul').selectAll('li').data(new_cells);
    //
    //             new_list.attr('id',function(d){return 'viz-'+d;}).classed('cellid',true)
    //             .html(function(d){return 'In['+d+']';}).enter()
    //             .append('li').classed('list-group-item',true).append('a').classed('cellid',true).attr('id',function(d){return 'viz-'+d;})
    //             .html(function(d){return 'In['+d+']';});
    //
    //             new_list.exit().attr('opacity',1).transition().delay(500).attr('opacity',0).remove();
    //
    //             let changed_list = d3.select('#changedlist').select('ul').selectAll('li').data(changed_cells);
    //
    //             changed_list.attr('id',function(d){return 'viz-'+d;}).classed('cellid',true)
    //             .html(function(d){return 'In['+d+']';}).enter()
    //             .append('li').classed('list-group-item',true).append('a').classed('cellid',true).attr('id',function(d){return 'viz-'+d;})
    //             .html(function(d){return 'In['+d+']';});
    //
    //             changed_list.exit().attr('opacity',1).transition().delay(500).attr('opacity',0).remove();

    d3.select('#table')
      .selectAll('.cellid')
      .on('click', function (d) {
        that.setDetails(d);
      });

    //that.decorate_cells(changed_cells,'changed-cell',true);
  };

  decorateCells = function (cells: any[], cssClass: string, allCells: any[]) {
    cells = cells || [];
    allCells = allCells || false;

    if (allCells) {
      $('.cluster').find('polygon').toggleClass(cssClass, false);
    }

    cells.forEach(function (uuid) {
      $('#' + uuid + 'cluster')
        .find('polygon')
        .toggleClass(cssClass, true);
    });
  };

  decorateCell = function (uuid: string, cssClass: string, toggle: boolean) {
    if (this.isOpen) {
      uuid = uuid || '';
      $('#' + uuid + 'cluster')
        .find('polygon')
        .toggleClass(cssClass, toggle);
    }
  };

  /** @method this creates and renders the actual visual graph **/
  createGraph = function (g: any) {
    let that = this;
    g.nodes().forEach(function (v: any) {
      let node = g.node(v);
      // Round the corners of the nodes
      node.rx = node.ry = 5;
    });

    that.dotgraph = Writer.write(g);

    //FIXME: Something weird is going on here with the transitions if you declare them at the start they fail
    //but if you declare them here there is a large delay before the transition happens
    that.graphtran = d3.transition().duration(750).ease(d3.easeLinear);

    //FIXME: Not ideal way to be set this up, graphviz requires a set number of pixels for width and height
    graphviz('#svg-div')
      .options(defaultOptions)
      .on('end', function () {
        that.updateCellLists();
        that.doneRendering = true;
      })
      .transition(that.graphtran)
      .renderDot(that.dotgraph);

    let dotURL = URL.createObjectURL(
      new Blob([that.dotgraph], { type: 'text/plain;charset=utf-8' })
    );
    $('#dot-dl').attr('href', dotURL).attr('download', 'graph.dot');

    $('g.parentnode.cluster').each(function () {
      $(this)
        .mouseover(function () {
          let node = $(this),
            cellid = node
              .find('text')
              .text()
              .substr(that.cellLabel.length, uuidLength);

          that.setDetails(cellid);

          //var cell = Jupyter.notebook.get_code_cell(cellid);
          that.dfgraph.getDownstreams(cellid).forEach(function (t: string) {
            $('#' + t.substr(0, uuidLength) + 'cluster')
              .find('polygon')
              .toggleClass('upcell', true);
            $('g.' + cellid + t.substr(0, uuidLength))
              .find('path')
              .toggleClass('upstream', true);
          });
          that.dfgraph.getImmUpstreams(cellid).forEach(function (t: string) {
            $('#' + t.substr(0, uuidLength) + 'cluster')
              .find('polygon')
              .toggleClass('downcell', true);
            $('g.' + t.substr(0, uuidLength) + cellid)
              .find('path')
              .toggleClass('downstream', true);
          });
        })
        .on('mouseout', function () {
          //var node = $(this);
          //cellid = node.find('text').text().substr(that.cell_label.length,uuid_length);
          //var cell = Jupyter.notebook.get_code_cell(cellid);
          $('.edge').each(function () {
            $(this)
              .find('path')
              .toggleClass('upstream', false)
              .toggleClass('downstream', false);
          });
          $('g.parentnode, .cluster')
            .each(function () {
              $(this)
                .find('polygon')
                .toggleClass('upcell', false)
                .toggleClass('downcell', false);
            })
            .contextmenu(function () {
              return false;
            });
        });
    });

    $('g.child-node').each(function () {
      $(this)
        .mouseover(function () {
          $('.viz-' + $(this).find('title').text()).each(function () {
            $(this).find('path').toggleClass('upstream', true);
            $(this).find('polygon').toggleClass('upcell', true);
          });
        })
        .mouseout(function () {
          $('.viz-' + $(this).find('title').text()).each(function () {
            $(this).find('path').toggleClass('upstream', false);
          });
          $(this).find('polygon').toggleClass('upcell', false);
        });
    });

    //FIXME: Fix the Jupyter notebook reference here
    //var deleted_cells = Object.keys(Jupyter.notebook.metadata.hl_list || []);
    //that.decorate_cells(deleted_cells,'deleted-cell',true);

    $('g.parentnode.cluster').on('mousedown', function (event) {
      if (event.which == 1) {
        that.closeAndScroll();
      }
    });
    //FIXME: Fix this
    // .on("contextmenu",function(event){
    //     var cellid = $(this).find('text').text().substr(that.cell_label.length, uuid_length);
    //     Jupyter.notebook.get_code_cell(cellid).execute();
    // });
  };

  /** @method this ellides the names of output nodes **/
  getNodes = function (uuid: string) {
    return this.dfgraph.getNodes(uuid).map(function (a: string) {
      return a.length > 10 ? a.substring(0, 7) + '..' : a;
    });
  };

  /** @method this creates the graphlib data structure that is used to create the visualization **/
  createNodeRelations = function () {
    let that = this;
    that.cellLinks = [];
    that.cellList = [];
    that.cellChildNums = [];
    that.outputNodes = [];
    let outnames: string[] = [];

    if (that.dataflow) {
      //Should provide a better experience since order handles deletions
      that.updateOrder(that.tracker.currentWidget.model.cells.model.cells.map((cell:any) => cell.id),false);
      that.cellList = that.order.map((cell:any) => cell.replace(/-/g, '').substr(0, 8));
      that.cellList.forEach(function (uuid: string) {
        that.outputNodes[uuid] = that.getNodes(uuid);
        outnames = that.outputNodes[uuid];
        that.dfgraph.getUpstreams(uuid).forEach(function (b: string) {
          b = b.length > 10 ? b.substring(0, 7) + '..' : b;
          if (outnames.indexOf(uuid) > -1) {
            that.cellLinks.push({ source: b, target: uuid });
          } else {
            that.cellLinks.push({ source: b, target: uuid + '-Cell' });
          }
        });
      });
      //FIXME: Change this
      that.cellList = that.cellList.map(function (uuid: string) {
        return { id: uuid };
      });
    } else {
      //Should provide a better experience
      that.updateOrder(that.tracker.currentWidget.model.cells.model.cells.map((cell:any) => cell.id),false);
      that.cellList = that.order.map((cell:any) => cell.replace(/-/g, '').substr(0, 8));
      that.cellList.forEach(function (uuid: string) {
        that.outputNodes[uuid] = that.getNodes(uuid);
        if (that.outputNodes[uuid].length == 0) {
          delete that.outputNodes[uuid];
          return;
        }

        outnames = that.outputNodes[uuid];

        if (uuid in that.outputNodes && that.cellList.indexOf(uuid) > 1) {
          that.dfgraph.getUpstreams(uuid).forEach(function (b: string) {
            b = b.length > 10 ? b.substring(0, 7) + '..' : b;
            if (outnames.indexOf(uuid) > -1) {
              that.cellLinks.push({ source: b, target: uuid });
            } else {
              outnames.forEach(function (t: string) {
                that.cellLinks.push({ source: b, target: uuid + t });
              });
            }
          });
        }
      });
      //FIXME: Change this
      that.cellList = Object.keys(that.outputNodes).map(function (t: string) {
        return { id: t };
      });
    }

    that.cellList.forEach(function (a: any) {
      that.cellChildNums[a.id] = 0;
    });
    that.cellLinks.forEach(function (a: any) {
      that.cellChildNums[a.source] += 1;
    });
    //let g = new GraphLib.Graph({ compound: true })
    let g = new dagre.graphlib.Graph({ compound: true })
      // .setGraph({
      //   compound: true,
      //   ranksep: 1,
      //   nodesep: 0.03,
      //   tooltip: ' ',
      //   rankdir: 'LR'
      // })
      .setDefaultEdgeLabel(function () {
        return {};
      });

    that.cellList.forEach(function (a: any) {
      if (that.outputNodes[a.id]) {
        if (that.selected && a.level == 0) {
          g.setNode('cluster_Out[' + a.id + ']', {
            label: that.cellLabel + a.id,
            data: {'label': that.cellLabel + a.id},
            //id: 'selected',
            //clusterLabelPos: 'top',
            //class: 'parentnode cellid',
            width: nodeWidth,//*2,
            height: nodeHeight,//*2,
            //shape: 'box',
            margin: 5
          });
        } else {
          g.setNode('cluster_Out[' + a.id + ']', {
            label: that.cellLabel + a.id,
            data: {'label': that.cellLabel + a.id},
            id: a.id + 'cluster',
            clusterLabelPos: 'top',
            //class: 'parentnode cellid',
            //tooltip: ' ',
            width: nodeWidth*2,
            height: nodeHeight*2,
            // shape: 'box',
            margin: 5
          });
        }
      }
    });

    Object.keys(that.outputNodes).forEach(function (a: any) {
      let parent = 'cluster_Out[' + a + ']';
      let parentid = a + 'cluster';
      if (that.dataflow || that.selected) {
        let cell = a + '-Cell';
        g.setNode(cell, {
          label: 'Cell[' + a + ']',
          //data: {'label': 'Cell[' + a + ']'},
          //class: 'child-node prompt output_prompt cellid',
          // labelStyle: that.labelstyles,
          // style: 'invis',
          // peripheries: 0,
          height: 1,//nodeWidth,
          width: 1,//nodeWidth,
          // margin: '0,0',
          // tooltip: ' ',
          // shape: 'point',
          parentId: parentid,
          extent: 'parent',
          id: cell
        });
        g.setParent(cell, parent);
      }
      that.outputNodes[a].forEach(function (t: string) {
        //var uuid = t.substr(4,uuid_length);
        //FIXME: Make this more robust so it uses uuid_length
        if (/cluster_Out\_[a-f0-9]{8}/.test(t)) {
          g.setNode(a + t, {
            label: parent,
            data: {'label': parent},
            // class: 'child-node prompt output_prompt cellid',
            // labelStyle: that.labelstyles,
            // tooltip: ' ',
            // shape: 'box',
            id: a + t,
            width: nodeWidth,
            height: nodeHeight,
            type: 'group',
            //margin: '0.1,0.01'
          });
          g.setParent(a + t, parent);
        } else {
          g.setNode(a + t, {
            label: t,
            data: {'label': t},
            // class: 'child-node prompt output_prompt cellid',
            // labelStyle: that.labelstyles,
            // tooltip: ' ',
            // shape: 'box',
            id: a + t,
            width: nodeWidth,
            height: nodeHeight,
            parentId: parentid,
            extent: 'parent',
            //margin: '0.1,0.01'
          });
          g.setParent(a + t, parent);
        }
      });
    });

    that.cellLinks.forEach(function (a: any) {
      if (g.hasNode(a.source) && g.hasNode(a.target)) {
        let target = a.target;
        // if(a.target.includes('-Cell')){
        //   target = a.target.substr(0,a.target.length-5)+'cluster';
        // }
        g.setEdge(a.source, target, {
          class:
            a.source.substr(0, uuidLength) +
            a.target.substr(0, uuidLength) +
            ' viz-' +
            a.source,
          id: 'viz-' + a.source + a.target,
          lhead: 'cluster_Out[' + a.target.substr(0, uuidLength) + ']',
          type: edgeType
        });
      }
    });

    if (that.debugMode) {
      console.log(that.cellList);
      console.log(that.outputNodes);
      console.log(that.cellLinks);
      //console.log(g.children());
      console.log(g.nodes());
      console.log(g.edges());
      //console.log(Writer.write(g));
    }

    return g;
  };

  

  /** @method this opens and closes the depviewer **/
  // toggleDepView = function () {
  //   //let that = this;
  //   function MyComponent() {
  //     return <p>This is my React content</p>;
  //   }
  //   const ele = document.getElementById('depview')!;
  //   //ele.innerHTML = '';
  //   const root = ReactDOM.createRoot(ele);//.innerHTML = 
  //   root.render(<MyComponent />);
  // };
  toggleDepView = function () {
    let that = this;
    if (this.isOpen) {
      that.closeDiv();
    } else {
      that.isOpen = true;

      //that.active_cell = Jupyter.notebook.get_selected_cell().uuid;

      //FIXME: Doesn't currently exist in this version
      //var deleted_cells = Object.keys(Jupyter.notebook.metadata.hl_list || []);
      //that.decorate_cells(deleted_cells,'deleted-cell',true);

      //FIXME: Possibly change this?
      //GraphViz relies on the size of the svg to make the initial adjustments so the svg has to be sized first
      d3.select(that.parentdiv)
        .transition()
        .delay(100)
        .style('height', '60vh')
        .on('end', function () {
          if (that.dfgraph.wasChanged) {
            that.doneRendering = false;
            that.startGraphCreation();
          }
        });

      d3.select('.end_space').transition().delay(100).style('height', '60vh');
      that.depdiv.style.display = 'block';
    }
  };

  /** @method starts graph creation **/
  startGraphCreation = function () {
    let that = this;
    const dagreGraph = this.createNodeRelations();
    //const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
 
const getLayoutedElements = (direction:string = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });
 
  // nodes.forEach((node:any) => {
  //   dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  // });
 
  // edges.forEach((edge:any) => {
  //   dagreGraph.setEdge(edge.source, edge.target);
  // });
 
  dagre.layout(dagreGraph);
  console.log(dagreGraph);
  
  const newNodes = dagreGraph.nodes().filter((node:any) => (!node.includes('-Cell') && !(dagreGraph.node(node).label == '') && (node.includes('cluster')))).map((node:any) => {
    
    const nodeWithPosition = dagreGraph.node(node);
    const uuid = node.substring(12,node.length-1);
    console.log(nodeWithPosition);
    console.log(that.outputNodes);
    console.log(node.substring(12,node.length-1));
    let ratio = node.includes('cluster') ? that.outputNodes[uuid].length : 1;
    let offset = node.includes('cluster') ? 20 : 0;
    const newNode = {
      ...nodeWithPosition,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
    newNode.data['outputs'] = that.outputNodes[uuid].map((node:any) =>{
      return {label:node, id:uuid+node};
    });
    newNode['type'] = 'depNode';
    newNode['width'] = nodeWidth*ratio+offset;

    return newNode;
  });

  const newEdges = dagreGraph.edges().map((edge:any)=>{
    let edgetarget = edge['w'];
    if(edgetarget.includes('-Cell')){
      edgetarget = edgetarget.substring(0,edgetarget.length-5)+'cluster';
    }
    return {'id':'e'+edge['v']+edge['w'],'sourceHandle':edge['v'],'source':edge['v'].substring(0,8)+'cluster','target':edgetarget,'type':edgeType,'animated':true}
  });
 
  return { nodes: newNodes, edges:newEdges };
};
 
const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements();
console.log(layoutedNodes,layoutedEdges); 

const Flow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
 
  const onConnect = useCallback(
    (params:any) => {

    
      setEdges((eds:any) =>
        addEdge(
          { ...params, type: ConnectionLineType.Bezier, animated: true },
          eds,
        ),
      )
    console.log(params);
    },
    [],
  );
  const onLayout = useCallback(
    (direction:any) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(direction);
 
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges],
  );
 
  return (
    <div style={{ height:800, width:"100%"}}>
    <ReactFlow
      nodes={nodes}
      nodeTypes={nodeTypes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      connectionLineType={ConnectionLineType.Bezier}
      fitView
      
    >

    <MiniMap nodeStrokeWidth={3} zoomable pannable />
      <Panel position="top-right">
        <button onClick={() => onLayout('TB')}>vertical layout</button>
        <button onClick={() => onLayout('LR')}>horizontal layout</button>
      </Panel>
    </ReactFlow>
    </div>
  );
};

    const ele = document.getElementById('depview')!;
    //ele.innerHTML = '';
    const root = ReactDOM.createRoot(ele);//.innerHTML = 
    root.render(<Flow />);

    //let g = this.createNodeRelations();
    //this.createGraph(g);
    that.dfgraph.wasChanged = false;
  };

  /** @method set graph, sets the current activate graph to be visualized */
  setGraph = function (graph: any) {
    this.dfgraph = graph;
  };
  //
  //
}
