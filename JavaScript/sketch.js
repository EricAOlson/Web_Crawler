/***  Team Omega - CS419_400 WebCrawl ***/

//Global var to track enlarged text boxes that need to be removed.
var expanded = false;
var inside = false;


/************************************************************
 * This is the default looping function of P5.  This is run continouslly while the page is loaded.
 * Currently this function only looks to see if the user has moused over one of the nodes, and 
 * provides an expanded text box with full title, and URL.
 ************************************************************/
function draw(){
  //Check if visualization is actually shown to screen.
  if (document.getElementById("vis").childNodes.length > 2 && data_avail){
    var x, nodeX, nodeY;
    
    //Cycle through existing nodes to see if user is mousing over.
    inside = false;
    for (x = 0; x < vis_count; x++){
      nodeX = node_locations[x][0] + center_adjust;
      nodeY = node_locations[x][1];
      if(mouseX > nodeX - 25 && mouseX < nodeX + 25 && mouseY < nodeY + 40 && mouseY > nodeY - 25){
        enlarge_box(nodeX, nodeY, x);
        inside = true;
      }
    }
    if (expanded && !inside){
      new_vis();
      expanded = false;
    }
  }
}
/******* End of draw() *******/



/************************************************************
 * This function draws the expanded text box used when a user mouses
 * over a node in the vizualization.
 ************************************************************/
function enlarge_box(x, y, ind){
  //Apply a shift for nodes right next to the left or right wall.
  var horiz_shift = 0;
  if (x < 103) { x = 103; }
  else if (x > (vis_width - 105)) { x = vis_width - 105; }

  //Print enlarged rectangle for background.
  rectMode(CORNER);
  strokeWeight(1);
  stroke(color(0,0,0));
  fill(256,256,256);
  rect(x - 100, y + 28, 200, 72);
  //Print text.
  textSize(10);
  textStyle(NORMAL);
  textAlign(LEFT);
  strokeWeight(1);
  fill(0,0,0);
  textFont('Courier');
  var info = "Title: " + node_locations[ind][5].substring(0,24) + "\nURL: " + node_locations[ind][6].substring(0,26);
  if (node_locations[ind][6].length > 26) { info += "\n" + node_locations[ind][6].substring(26, 58); }
  if (node_locations[ind][6].length > 58) { info += "\n" + node_locations[ind][6].substring(58, 90); }
  if (node_locations[ind][6].length > 90) { info += "\n" + node_locations[ind][6].substring(90, 122); }
  if (terminated && (ind + 1) == results.Count) { info += "\n" + "Stopped @ '" + results.Term_Text.substring(0,20) + "'"; }
  text(info, x - 98, y + 30, 196, 80);
  expanded = true;
  textFont("Helvetica");
}
/******* End of enlarge_box() *******/



/************************************************************
 * Function is workhorse of P5 visualization.  This function uses the array of node locations,
 * and draws them to screen.  This also includes the KEY, and support for partial draw's required
 * for player controls.
 ************************************************************/
function new_vis(){
  var pic = document.getElementById("vis");
  var x;
  
  //Clear any previous drawings
  while (pic.hasChildNodes()) { pic.removeChild(pic.lastChild); }
  
  //Draw new graph if data is available.
  if (data_avail) {
    var cell, header, myCanvas;

    //Add Collapsable icon.
    cell = document.createElement("img");
    cell.setAttribute("src", "IMG/Collapse.JPG");
    cell.setAttribute("onClick", "visualization(false)")
    pic.appendChild(cell);
    
    //Add Header
    cell = document.createElement("caption");
    header = document.createTextNode("Web Crawler Search Results - Visualization");
    cell.appendChild(header);
    cell.setAttribute("id", "vis_header");
    pic.appendChild(cell);

    //Create Visualization Background:
    myCanvas = createCanvas(vis_width, vis_height);
    myCanvas.parent("vis");
    strokeWeight(4);
    rectMode(CORNER);
    rect(0, 0, vis_width, vis_height, 20);
    
    //Draw lines first:
    stroke(color(0, 0, 0));
    strokeWeight(3);
    noFill();
    for (x = 1; x < vis_count; x++){
      var c = {x:0, y:0};
      var p = {x:0, y:0};
      var horiz_shift;
      
      //Identify node locations
      c.x = node_locations[x][0] + center_adjust;
      c.y = node_locations[x][1];
      p.x = node_locations[x][2] + center_adjust;
      p.y = node_locations[x][3];
      horiz_shift = ((c.x + p.x) / 3);

      //Draw connecting curve.
      curve(c.x, c.y + 450, c.x, c.y, p.x, p.y, p.x, p.y - 450);
    }

    //Draw nodes & #'s' next:
    textSize(25);
    textStyle(NORMAL);
    stroke(color(0, 0, 128));
    strokeWeight(4);
    for (x = 0; x < vis_count; x++){
      var shift;
      strokeWeight(4);
      fill(256,256,256);
      //Turn node red if termination node.
      if (terminated && x == node_locations.length - 1) { stroke(color(256, 0, 0)); }
      ellipse(node_locations[x][0] + center_adjust, node_locations[x][1], 50, 50);
      if (x < 9) { shift = 7; }
      else { shift = 14; }
      stroke(color(0, 0, 128));
      strokeWeight(1);
      fill(0, 0, 70);
      text(x + 1, node_locations[x][0] - shift + center_adjust, node_locations[x][1] + 8);
    }

    //Add Page Titles to Node.
    textSize(11);
    textStyle(NORMAL);
    textAlign(CENTER);
    rectMode(CENTER);
    color(128);
    for (x = 0; x < vis_count; x++){
      //Draw white background so title can be read against lines:
      noStroke();
      fill(256,256,256);
      rect(node_locations[x][0] + center_adjust, node_locations[x][1] + 33, 6.5 * node_locations[x][4].length, 11);
      //Print title:
      stroke(color(0, 0, 128));
      strokeWeight(1);
      fill(0, 0, 70);
      text(node_locations[x][4], node_locations[x][0] + center_adjust, node_locations[x][1] + 36);
    }

    //Draw Visualization Key ("0 - Webpage Found   0(red) - Page contained termination keyword, Web_Crawl terminated.")
    //Seperating Line:
    stroke(color(0, 0, 0));
    strokeWeight(2);
    line(25, vis_height - 85, vis_width - 25, vis_height - 85);

    //Key Header:
    textSize(18);
    textStyle(BOLD);
    stroke(color(0, 0, 128));
    strokeWeight(1);
    text("KEY:", 50, vis_height - 42);
    
    //Basic Node Image:
    stroke(color(0, 0, 128));
    strokeWeight(4);
    fill(256,256,256);
    ellipse(115, vis_height - 50, 50, 50);
    //Termination Node Image
    stroke(color(256, 0, 0));
    ellipse(320, vis_height - 50, 50, 50);

    //Node Labels
    textStyle(NORMAL);
    textSize(25);
    stroke(color(0, 0, 128));
    strokeWeight(1);
    fill(0, 0, 70);
    text("ID", 116, vis_height - 42);
    text("ID", 321, vis_height - 42);
    textSize(11);
    text("Page Title", 115, vis_height - 14);
    text("Page Title", 321, vis_height - 14);

    //Add Explaination Text
    textSize(13);
    textStyle(NORMAL);
    stroke(color(0, 0, 70));
    strokeWeight(1);
    text("- Webpage Found", 198, vis_height - 44);
    text("-", 355, vis_height - 44);
    textAlign(LEFT)
    text("Webpage contained termination keyword", 362, vis_height - 49);
    text("Web Crawl terminated", 362, vis_height - 35);
    
    //Add Play/Pause Buttons Images and functionality.
    var section, div, cell, images, funct, i;
  
    //Define Images & Function Calls to add.
    images = ["IMG/Restart.JPG", "IMG/StepBack.JPG", "IMG/Pause.JPG", "IMG/Play.JPG", "IMG/StepFwd.JPG", "IMG/End.JPG"];
    funct = ["cont_reset()", "cont_back()", "cont_pause()", "cont_play()", "cont_fwd()", "cont_end()"];

    //Add Player Control Images with onclick() functions to div following visualization.
    section = document.getElementById("vis");
    div = document.createElement("div");
    div.setAttribute("id", "control");
    for (i = 0; i < images.length; i++){
      cell = document.createElement("img");
      cell.setAttribute("src", images[i]);
      cell.setAttribute("onclick", funct[i]);
      div.appendChild(cell);      
    }
    section.appendChild(div);
  }
  
  //Otherwise only draw expandable icon and header.  results only == null at page load when we want to draw nothing.
  else if (results != null){
    var cell, header;
    
    //Add Collapsable icon.
    cell = document.createElement("img");
    cell.setAttribute("src", "IMG/Expand.JPG");
    cell.setAttribute("onClick", "visualization(true)")
    pic.appendChild(cell);
    
    //Add Header
    cell = document.createElement("caption");
    header = document.createTextNode("Web Crawler Search Results - Visualization");
    cell.appendChild(header);
    cell.setAttribute("id", "vis_header");
    pic.appendChild(cell);
  }
}
/******* End of new_vis() *******/