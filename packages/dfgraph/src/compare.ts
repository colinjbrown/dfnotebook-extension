//console.log("Loaded");
//document.domain='127.0.0.1'
//$('#leaveCode').val('None');



import * as d3 from "d3";
import $ from "jquery";
import {BubbleSets, PointPath, addPadding} from 'bubblesets-js';
import { graphviz, GraphvizOptions } from "d3-graphviz";
//FIXME: Use this
//import * as GraphLib from "graphlib";


const defaultOptions: GraphvizOptions = {
  height: 500,
  width: 500,
  scale: 1,
  tweenPrecision: 1,
  engine: "dot",
  keyMode: "title",
  convertEqualSidedPolygons: false,
  fade: false,
  growEnteringEdges: false,
  fit: true,
  tweenPaths: false,
  tweenShapes: false,
  useWorker: false,
  zoom: false
};


export class Comparer {

    resultant: any;
    source: any;
    size: Number;
    pad: Number;
    bubbles: BubbleSets;
    nb1graph: any;
    nb2graph: any;
    cellpaths: boolean;
    cellcolors: boolean;
    url1: string;
    url2: string;
    dgraph: string;
    reduced: string;
    isreduced: boolean;
    DEFAULTWIDTH: string;
    parentdiv: string;
    nodes: any;
    notnodes: any;
    nb1: any;
    nb2: any;
    names: any;
    links: any;
    num_nbs: Number;

    constructor(dfgraph?: any, parentdiv?: any) {
        this.resultant = [];
        this.source = [];
        this.size = 10;
        this.pad = 5;
        this.bubbles = new BubbleSets();
        this.nb1graph = [];
        this.nb2graph = [];
        this.cellpaths = false;
        this.cellcolors = true;
        this.url1 = '';
        this.url2 = '';
        this.dgraph = '';
        this.reduced = '';
        this.isreduced = false;
        this.DEFAULTWIDTH = '45vw';
        this.init_listeners();
        this.parentdiv = "#comparer";
        this.nodes = [];
        this.notnodes = [];
        this.nb1 = {};
        this.nb2 = {};
        this.names = {};
        this.links = {};
        this.num_nbs = 4;
    }


init_listeners = function(){
    window.addEventListener('load', function () {
        //Disable File Selection by Default
    //    $("#filepicker").prop('disabled', true);
        $('#dirlisting').hide();
        $('#compare').hide();


        $(".mode").change(function(){
            var radioValue = $("input[name='mode']:checked").val();
            console.log(radioValue)
            if(radioValue == "nbmulti"){
    //            $("#filepicker").prop('disabled', false);
                $("#nb1").prop('disabled', true);
                $("#nb2").prop('disabled', true);
                $('#nb1.container').hide();
                $('#nb2.container').hide();
                $('#hidenb1').hide();
                $('#hidenb2').hide();
                $('#compare').show();
                $('#dirlisting').show();
                $('#out').hide();
                $('#page').width('100vw');
            }
            else{
    //            $("#filepicker").prop('disabled', true);
                $("#nb1").prop('disabled', false);
                $("#nb2").prop('disabled', false);
                $('#nb1.container').show();
                $('#nb2.container').show();
                $('#hidenb1').show();
                $('#hidenb2').show();
                $('#compare').hide();
                $('#out').show();
                $('#dirlisting').hide();
                $('#page').width('45vw');
            }
        });


    //    document.getElementById("filepicker").addEventListener("change", function(event) {
    //      var output = document.getElementById("listing");
    //      console.log(output);
    //      var files = event.target.files;
    //      console.log(files);
    //      for (let i=0; i<files.length; i++) {
    //        let item = document.createElement("li");
    //        item.innerHTML = files[i].webkitRelativePath;
    //        output.appendChild(item);
    //      };
    //    }, false);



        });
    }








transition_digraph = function(){
    let that = this;
    let graphtran = d3.transition()
            .duration(1500)
            .ease(d3.easeLinear);
    
    this.isreduced = !this.isreduced;
    if(this.isreduced){
        graphviz(that.parentdiv).options(defaultOptions).renderDot(that.dgraph)
        //FIXME: Transition appears to be fine if you do a ts-ignore
        //@ts-ignore
        .transition(graphtran);
        that.removepaths();
        that.createPaths();
    }
    else{
        graphviz(that.parentdiv).options(defaultOptions).renderDot(that.reduced)
        //FIXME: Transition appears to be fine if you do a ts-ignore
        //@ts-ignore
        .transition(graphtran);
        that.removepaths();
        that.createPaths();
    }

}


removepaths = function(){
    ['nb1graph','nb2graph'].forEach(function (a:string){
        var ele = document.getElementById(a) || null;
        if (ele != null){
            ele.parentNode?.removeChild(ele);
        }
    })
}

hidepaths = function(nbflag:string='false'){
    var group = []
    if(nbflag == 'nb1'){
        group = ['nb1graph']
    }
    else if(nbflag == 'nb2'){
        group = ['nb2graph']
    }
    else{
        group = ['nb1graph','nb2graph']
    }
    group.forEach(function(a:string){
        let element = document.getElementById(a);
        //@ts-ignore
        let style = element.style.display;
        if(style === "none"){
            style = "block";
            //document.getElementById(a).style.display = "block";
        }
        else{
            style = "none";
            //document.getElementById(a).style.display = "none";
        }
    });

}

createAdjacencyMatrix = function(adj:any) {
console.log(adj)

    d3.selectAll('#adj svg').remove();

    d3.select('#adj').append("svg")
  .style("width", adj.length*35+200 + 'px')
  .style("height", adj[0].length*35+200 + 'px');

    let zoom = d3.zoom()
              .scaleExtent([1, 10])
              .translateExtent([[0, 0], [adj.length*35+100, adj[0].length*35+100]]);
    //This is apparently the correct way to do this
    //See: https://github.com/d3/d3-scale/issues/111
    const someColors = d3.scaleLinear<string>().domain([0,1]).range(['red', 'green']);
d3.select("#adj svg").append("g")
		.attr("transform","translate(50,50)")
		.attr("id","adjacencyG")
		.selectAll("rect")
		.data(adj)
		.enter().append('g').each(function(d:any,i:any){
		d3.select(this).selectAll('rect').data(d).enter()
		.append("rect").attr("class","grid")
		.attr("width",35)
		.attr("height",35)
		.attr("x", function(d:any,j:number){ return j*35;})
		.attr("y", function(d:any,j:number){ return i*35;})
            .attr("id",function(d:any,j:number){ return j+"-"+i;})
		.style("fill", function(d:any,j:number){ return someColors(d);})
}).call(zoom);


d3.select("#adj svg")
		.append("g")
		.attr("transform","translate(50,45)")
		.selectAll("text")
		.data([...Array(adj[0].length).keys()])
		.enter()
		.append("text")
		.attr("x", (d:any,i:number) => i * 35 + 17.5)
		.text((d:any) => "Cell " + (parseInt(d)+1))
		.style("text-anchor","middle")
		.style("font-size","9px")

	d3.select("#adj svg")
		.append("g").attr("transform","translate(45,50)")
		.selectAll("text")
		.data([...Array(adj.length).keys()])
		.enter()
		.append("text")
		.attr("y",(d:any,i:number) => i * 35 + 17.5)
		.text((d:any) => "Cell " + (parseInt(d)+1))
		.style("text-anchor","end")
		.style("font-size","9px")

//@ts-ignore
const box = document.querySelector('#adjacencyG')?.getBBox();
const scale = Math.min(window.innerWidth / box.width, window.innerHeight / box.height);

// Reset transform.
let transform = d3.zoomIdentity;
// Center [0, 0].
transform = transform.translate(window.innerWidth / 2, window.innerHeight / 2);
// Apply scale.
transform = transform.scale(scale);
// Center elements.
transform = transform.translate(-box.x - box.width / 2, -box.y - box.height / 2);
zoom.transform(d3.select('#adj svg'), transform);

//FIXME: replace this to go to notebook cell
//d3.selectAll("rect.grid").on("mouseover", gridOver);

// 	function gridOver(d:any) {
//         var nbcells = (this.id).split('-');
//         document.getElementById('work_frame1').contentWindow.Jupyter.notebook.scroll_to_cell(nbcells[1],100);
//         document.getElementById('work_frame1').contentWindow.Jupyter.notebook.get_cell(nbcells[1]).select();
//
//         document.getElementById('work_frame2').contentWindow.Jupyter.notebook.scroll_to_cell(nbcells[0],100);
//         document.getElementById('work_frame2').contentWindow.Jupyter.notebook.get_cell(nbcells[0]).select();
//
//         var contenta = document.getElementById('work_frame1').contentWindow.Jupyter.notebook.get_cell(nbcells[1]).get_text();
//         var contentb = document.getElementById('work_frame2').contentWindow.Jupyter.notebook.get_cell(nbcells[0]).get_text();
//         //console.log(contenta.split(/\r?\n/));
//         //console.log(contentb.split(/\r?\n/));
//         //console.log(difflib.unifiedDiff(contenta.split(/\r?\n/),contentb.split(/\r?\n/)));
//
//         $('#code').empty();
//         var code = difflib.unifiedDiff(contenta.split(/\r?\n/),contentb.split(/\r?\n/)).join('\n');
//         console.log(code);
//         var codeElement = document.getElementById('code');
//         var codeMirror = CodeMirror(
//               codeElement,
//               {
//                 value: code,
//                 mode: "diff",
//                 theme: "default",
//                 lineNumbers: false,
//                 readOnly: true
//           });
//         codeMirror.setSize(null, 500);
// //    $('#results').empty();
// //    resultant[idx].forEach(function (a){
// //        $('#results').append(a);
// //    })
//         //console.log(document.getElementById('work_frame1').contentWindow.Jupyter.get_cell(notebook.scroll_to_cell(nbcells[0],100))
//         //console.log(nbcells);
// 	};


}


togglecellcolors = function(){
    this.cellcolors = !this.cellcolors;
    if(this.cellcolors){
        $('.cluster polygon').attr('id','');
    }
    else{
        $('.cluster polygon').attr('id','nofill');
    }
}

includecells = function(){
    this.cellpaths = !this.cellpaths;
    this.createPaths();
}

//function hidelowconnects(){
//
//}
dirPaths = function(){
    let colors = d3.scaleOrdinal(d3.schemeCategory10);

    for(var i = 0; i < this.num_nbs; i++){

        d3.select('svg g').append("path").attr('id','nb-'+(i.toString())+'graph').attr('fill',colors(i.toString())).attr('opacity','.5').attr('stroke','black');
        var class_label = 'nb-'+i.toString();
        $('.'+class_label+ '.cluster polygon').map(function(a:any,b:any){

        })
        $('.cluster polygon').not($('.'+class_label)).map(function(a:any,b:any){

        })
    }
}


createPaths = function(){

    let that = this;
    let nodepts: { [name:string]: any} = {};
    this.nb2 = {};
    let onlynb1: { [name:string]: any} = {};
    let onlynb2: { [name:string]: any} = {};


    if (this.cellpaths == true){
        $('.multiple.cluster polygon').map(function(a:any,b:any){
            let nodename = $(this)?.parent()?.parent()?.attr('id')?.substr(2) || '';
            let res: { [name:string]: Number} = {};
            res['x'] = Math.min(b.points[0].x,b.points[1].x,b.points[2].x);
            res['y'] = Math.min(b.points[0].y,b.points[1].y,b.points[2].y);
            res['width'] = Math.max(Math.abs(b.points[0].x - b.points[1].x), Math.abs(b.points[0].x - b.points[2].x));
            res['height'] = Math.max(Math.abs(b.points[0].y - b.points[1].y), Math.abs(b.points[0].y - b.points[2].y));

            nodepts[nodename] = res;
            that.nb2[nodename] = res;
        })
        $('.cluster.other polygon').not('multiple').map(function(a:any,b:any){
            let nodename = $(this)?.parent()?.parent()?.attr('id')?.substr(2) || '';
            let res: { [name:string]: Number} = {};
            res['x'] = Math.min(b.points[0].x,b.points[1].x,b.points[2].x);
            res['y'] = Math.min(b.points[0].y,b.points[1].y,b.points[2].y);
            res['width'] = Math.max(Math.abs(b.points[0].x - b.points[1].x), Math.abs(b.points[0].x - b.points[2].x));
            res['height'] = Math.max(Math.abs(b.points[0].y - b.points[1].y), Math.abs(b.points[0].y - b.points[2].y));
            that.nb2[nodename] = res;
            onlynb2[nodename] = res;
        })
        $('.cluster.nb1 polygon').not('multiple').map(function(a:any,b:any){
            let nodename = $(this)?.parent()?.parent()?.attr('id')?.substr(2) || '';
            let res: { [name:string]: Number} = {};
            res['x'] = Math.min(b.points[0].x,b.points[1].x,b.points[2].x);
            res['y'] = Math.min(b.points[0].y,b.points[1].y,b.points[2].y);
            res['width'] = Math.max(Math.abs(b.points[0].x - b.points[1].x), Math.abs(b.points[0].x - b.points[2].x));
            res['height'] = Math.max(Math.abs(b.points[0].y - b.points[1].y), Math.abs(b.points[0].y - b.points[2].y));
            nodepts[nodename] = res;
            onlynb1[nodename] = res;
        })
    }




    $('g .node polygon').map(function(a:any,b:any)
    {
        let nodename:string = $(this)?.parent()?.parent()?.attr('id')?.substr(2) || '';
        let res: { [name:string]: Number} = {};
        res['x'] = Math.min(b.points[0].x,b.points[1].x,b.points[2].x);
        res['y'] = Math.min(b.points[0].y,b.points[1].y,b.points[2].y);
        res['width'] = Math.max(Math.abs(b.points[0].x - b.points[1].x), Math.abs(b.points[0].x - b.points[2].x));
        res['height'] = Math.max(Math.abs(b.points[0].y - b.points[1].y), Math.abs(b.points[0].y - b.points[2].y));
        if (that.nb1graph.includes(nodename))
        {
            nodepts[nodename] = res;
            if (that.nb2graph.includes(nodename)){
                that.nb2[nodename] = res;
            }
            else{
                onlynb1[nodename] = res;
            }
        }
        else {
            that.nb2[nodename] = res;
            onlynb2[nodename] = res;
        }
    });


    // $('g .node polygon').map(function(a,b)
    // {
    //     res = {}
    //     res['x'] = b.points[0].x;
    //     res['y'] = b.points[0].y;
    //     res['width'] = Math.max(Math.abs(b.points[0].x-b.points[1].x),Math.abs(b.points[0].x-b.points[2].x));
    //     res['height'] = Math.max(Math.abs(b.points[0].y-b.points[1].y),Math.abs(b.points[0].y-b.points[2].y));
    //     nodepts[$(this).parent().parent().attr('id')] = res;
    // });


    var nb = Object.keys(nodepts).map(function(a:string){return nodepts[a]},{});
    console.log(nb);
    var othernb = Object.keys(this.nb2).map(function(a:string){return this.nb2[a]},{});
    console.log(othernb);
    var onlynb1flat = Object.keys(onlynb1).map(function(a:string){return onlynb1[a]});
    var onlynb2flat = Object.keys(onlynb2).map(function(a:string){return onlynb2[a]});

    var list = this.bubbles.createOutline(
        addPadding(nb, this.pad),
        addPadding(onlynb2flat, this.pad),
        null /* lines */
    );

    var outline = new PointPath(list).simplify(0).bSplines().simplify(0);
//     .transform([
//       new ShapeSimplifier(0.0),
//       new BSplineShapeGenerator(),
//       new ShapeSimplifier(0.0),
//     ]);

    document.getElementById("nb2graph")?.setAttribute("d", outline.toString());

    var list = this.bubbles.createOutline(
        addPadding(othernb, this.pad),
        addPadding(onlynb1flat, this.pad),
        null /* lines */
    );

    var outline = new PointPath(list).simplify(0).bSplines().simplify(0);
//     .transform([
//       new ShapeSimplifier(0.0),
//       new BSplineShapeGenerator(),
//       new ShapeSimplifier(0.0),
//     ]);

    document.getElementById("nb1graph")?.setAttribute("d", outline.toString());
}





createPathMultiple = function(){
//FIXME: Get num notebooks
var nbnum = this.num_nbs;

this.nodes = [...Array(nbnum)].map(x => Array());
this.notnodes = [...Array(nbnum)].map(x => Array());

$('g .node polygon').map(function(a:any,b:any)
        {
        var node = $(this).parent().parent();
        //var nodename = node.attr('id').substr(2);
        let res: { [name:string]: Number} = {};
        res['x'] = Math.min(b.points[0].x,b.points[1].x,b.points[2].x);
        res['y'] = Math.min(b.points[0].y,b.points[1].y,b.points[2].y);
        res['width'] = Math.max(Math.abs(b.points[0].x - b.points[1].x), Math.abs(b.points[0].x - b.points[2].x));
        res['height'] = Math.max(Math.abs(b.points[0].y - b.points[1].y), Math.abs(b.points[0].y - b.points[2].y));
        [...Array(nbnum).keys()].map(function(a,b,c){

            console.log(node.parent());
            if(node.parent().hasClass('nb-'+a)){
                this.nodes[a].push(res);
            }
            else{
                this.notnodes[a].push(res);
            }
        });
    });

console.log(this.nodes);
console.log(this.notnodes);

[...Array(nbnum).keys()].map(function(a:any,b:any,c:any){


    var list = this.bubbles.createOutline(
        addPadding(this.nodes[a], this.pad),
        addPadding(this.notnodes[a], this.pad),
        null /* lines */
    );

    var outline = new PointPath(list).simplify(0).bSplines().simplify(0);
//     .transform([
//       new ShapeSimplifier(0.0),
//       new BSplineShapeGenerator(),
//       new ShapeSimplifier(0.0),
//     ]);
    console.log(outline.toString());
    document.getElementById("nb"+a+"graph")?.setAttribute("d", outline.toString());
});


//    var nb = Object.keys(nodepts).map(function(a,b){return nodepts[a]},{});
//    console.log(nb);
//    var othernb = Object.keys(nb2).map(function(a,b){return nb2[a]},{});
//    console.log(othernb);
//    var onlynb1flat = Object.keys(onlynb1).map(function(a,b){return onlynb1[a]});
//    var onlynb2flat = Object.keys(onlynb2).map(function(a,b){return onlynb2[a]});

//    var list = bubbles.createOutline(
//        BubbleSet.addPadding(othernb, pad),
//        BubbleSet.addPadding(onlynb1flat, pad),
//        null /* lines */
//    );
//
//    var outline = new PointPath(list).transform([
//      new ShapeSimplifier(0.0),
//      new BSplineShapeGenerator(),
//      new ShapeSimplifier(0.0),
//    ]);
//
//    document.getElementById("nb1graph").setAttribute("d", outline.toString());


}





htmlEntities = function(str:string) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

clearinfo = function(){
    $('#images').empty();
    $('svg').empty();
    $('#results').empty();
    $('#code').empty();
    $('#version').text('');
    $('#language').text('');
}

doBubbles = function(rects:any, others:any, elem:any){
    var rectSets = this.getRectangleSets(rects, others);
    var list = this.bubbles.createOutline(
      addPadding(rectSets[0], this.pad),
      addPadding(rectSets[1], this.pad),
      this.getEdges(rects)
    );
    var outline = new PointPath(list).simplify(0).bSplines().simplify(0);
//     .transform([
//       new ShapeSimplifier(0.0),
//       new BSplineShapeGenerator(),
//       new ShapeSimplifier(0.0),
//     ]);
    elem.setAttribute("d", outline.toString());
  }

//   this.doBubbles(rectanglesA, allIxs, pathA);
//   this.doBubbles(rectanglesB, allIxs, pathB);
//   this.doBubbles(rectanglesC, allIxs, pathC);

ixToRectangle = function(ix:string) {
    return {
      "x": this.nodes[ix][0] - this.size * 0.5,
      "y": this.nodes[ix][1] - this.size * 0.5,
      "width": this.size,
      "height": this.size,
    };
  }

ixsToEdge = function(edge:any) {
    return {
      "x1": this.nodes[edge[0]][0],
      "y1": this.nodes[edge[0]][1],
      "x2": this.nodes[edge[1]][0],
      "y2": this.nodes[edge[1]][1],
    };
  }

displayresults = function(idx:any){
    // console.log(idx);
    // console.log(resultant);
    // console.log(resultant[idx]);
    $('#code').empty();
    //FIXME: Do something involving code display here
//     var code = this.source[idx];
//     var codeElement = document.getElementById('code');
//     var codeMirror = CodeMirror(
//               codeElement,
//               {
//                 value: code,
//                 mode: "python",
//                 theme: "default",
//                 lineNumbers: false,
//                 readOnly: true
//               });
    
    $('#results').empty();
    this.resultant[idx].forEach(function (a:any){
        $('#results').append(a);
    })
}

 sendname = function(name:string){
    let that = this;
    this.clearinfo();
    this.nb1 = $('#nblist option:selected').text();
    this.nb2 =$('#nblist2 option:selected').text();
    this.names = {}
    if (this.nb1 != 'None'){
        this.names['nb1'] = this.nb1;
    }
    if (this.nb2 != 'None'){
        this.names['nb2'] = this.nb2;
    }
      // $('#nb1').find('option').removeClass('selected');
      // $('#nb1').find('option:selected').addClass('selected');
    //  console.log(name);
    // if (name == null){
    //     return;
    // }
    if (Object.keys(this.names).length > 0) {
        $.ajax({
            type: "POST",
            dataType: 'json',
            url: "{{ url_for('load_nb') }}",
            data: JSON.stringify(this.names),
            contentType: 'application/json',
            success: function (result:any) {
                //$('#images').empty();
                console.log(result);
                this.resultant = [];
                $('#work_frame1').attr('src', result['nb1_link']);
                $('#version').text(result['version']);
                $('#language').text(result['language']);
                if('adj' in result){
                    this.createAdjacencyMatrix(result['adj']);
                }
                if (result['digraph']) {
                    this.links = result['links'];
                    this.nb1graph = result['nb1'];
                    this.nb2graph = result['nb2'];
                    this.dgraph = result['digraph'];
                    this.reduced = result['reduced_digraph'];
                    $('#work_frame2').attr('src', result['nb2_link']);
                    //console.log(result['overlap'])
                    graphviz(this.parentdiv).options(defaultOptions).renderDot(result['digraph']).width($('#graph').width() || 0)
                .height($('#graph').height() || 0)
                .fit(true)
                .zoom(true).on('end',function (){

                        d3.select('svg g').append("path").attr('id','nb1graph').attr('fill','#377eb8').attr('opacity','.5').attr('stroke','black');
                        d3.select('svg g').append("path").attr('id','nb2graph').attr('fill','#4daf4a').attr('opacity','.5').attr('stroke','black');
//                        $(this).nodes().forEach(function(v) {
//                                    var node = g.node(v);
//                                    // Round the corners of the nodes
//                                    node.rx = node.ry = 5;
//                        });

                        this.createPaths();

                        $("g.parentnode.cluster").each(function ()
                            {
                                $(this).mouseover(function(){
                                    let node = $(this);//,
                                    let cellid = node.find('text').text();//.substr("[",6);
                                    that.displayresults(cellid);
                                })
                            })
                    });
                }
                result['cells'].forEach(function (a:any, b:any, c:any) {
                    this.resultant.push([]);
                    this.source.push(a['source']);
                    if ('outputs' in a) {
                        a['outputs'].forEach(function (d:any, e:any, f:any) {
                            if (d['output_type'] == 'display_data') {
                                console.log(d);
                                console.log(Object.keys(d['data']));
                                Object.keys(d['data']).forEach(function (key) {
                                    if (key.includes('text')) {
                                        console.log(d['data'][key]);
                                        //$('#images').append('<p>' + htmlEntities(d['data'][key]) + '<p>');
                                        //resultant[b].push('<p>' + htmlEntities(d['data'][key]) + '<p>');
                                        this.resultant[b].push(d['data'][key]);
                                    } else if (key.includes('svg')) {
                                        //$('images').
                                        console.log(d['data'][key]);
                                    } else {
                                        var outputImg = document.createElement('img');
                                        outputImg.src = 'data:' + key + ";base64, " + d['data'][key];
                                        this.resultant[b].push(outputImg);
                                        //$('#images').append(outputImg);
                                    }

                                })
                            }
                        })
                    }
                    //console.log(c);
                    //})
                });

                // (result['cells']).forEach(function (a,b,c){
                //     console.log(a,b,c);
                // )

                console.log(this.resultant);

            }
        });
    }
  }

  senddir = function(){
    $.ajax({
            type: "POST",
            dataType: 'json',
            url: "{{ url_for('send_dir') }}",
            data: {},
            contentType: 'application/json',
            success: function (result) {
                console.log(result);
                this.dgraph = result['data'][0];
                this.reduced = result['data'][1];
                graphviz(this.parentdiv).options(defaultOptions).renderDot(result['data'][0]).width($('#graph').width() || 0)
                .height($('#graph').height() || 0)
                .fit(true)
                .zoom(true).on('end',function (){
                        var nbnum = 4;
                        [...Array(nbnum).keys()].map(function(a,b,c)
                            {
                                d3.select('svg g').append("path").attr('id','nb'+a+'graph').attr('fill',d3.schemeCategory10[a]).attr('opacity','.5').attr('stroke','black');
                            })
                        })
                        //d3.select('svg g').append("path").attr('id','nb1graph').attr('fill','#377eb8').attr('opacity','.5').attr('stroke','black');
                        //d3.select('svg g').append("path").attr('id','nb2graph').attr('fill','#4daf4a').attr('opacity','.5').attr('stroke','black');
//                        $(this).nodes().forEach(function(v) {
//                                    var node = g.node(v);
//                                    // Round the corners of the nodes
//                                    node.rx = node.ry = 5;
//                        });

                        //createPaths();

//                        $("g.parentnode.cluster").each(function ()
//                            {
//                                $(this).mouseover(function(){
//                                    var node = $(this);//,
//                                    cellid = node.find('text').text();//.substr("[",6);
//                                    displayresults(cellid);
//                                })
//                            })
//                    });

            }
            });

  }

  getdirlisting = function(event:any){
  //console.log(dir);
  event = event || window.event;
  if('textContent' in event){
    var src = event.textContent;
  }
  else{
    var src = event.target || event.srcElement;
    src = src.textContent;
  }
  console.log(src);
  let dir: { [name:string]: Number} = {};
  dir['path'] = src;

  
    $.ajax({
            type: "POST",
            dataType: 'json',
            url: "{{ url_for('get_dir') }}",
            data: JSON.stringify(dir),
            contentType: 'application/json',
            success: function (result) {

                $('#dirlisting').html(result['dir']);

            }
            });

  }
  };