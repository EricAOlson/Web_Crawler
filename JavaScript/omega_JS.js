/***  Team Omega - CS419_400 WebCrawl ***/

//Globally shared with sketch.js for visualization.
var node_locations = [];  
var data_avail = false;
var vis_height = 0;
var vis_width = 0;
var center_adjust = 0;
var vis_count = 0;
var vis_player = null;
var terminated = false;
var results = null;
var loop = false;

//Global variables used for local storage logic.
var local_count = 0;
var local_avail = false;


/************************************************************
 * Function clears any user input data, and removes previous tables/visulizations from the page.
 ************************************************************/
function reset() {
  var div;
  //Reset History selection, including call to lockInput to renable disabled fields.
  document.getElementById("history").selectedIndex = 0;
  lockInput();
  //Reset input field values.
  document.getElementById("url").value = "";
  document.getElementById("max").value = "";
  document.getElementById("term").value = "";
  document.getElementById("method").checked = true;
  //Finally clear any prior Crawler results tables/visualizations.
  div = document.getElementById("table");
  while (div.hasChildNodes()) { div.removeChild(div.lastChild); }
  div = document.getElementById("vis");
  while (div.hasChildNodes()) { div.removeChild(div.lastChild); }
  historyBuild();
}
/******* End of reset() *******/



/************************************************************
 * Function evaluates user input data, and either initiates a call for a new WebCrawl via an HTTP
 * call to the PHP middleware, or if localStorage is invoked loads local stored crawl data.  From
 * this data a results table is displayed along with a visualization of the crawler results.
 ************************************************************/
function new_crawl() {
  var div, cell, text;

  //Clear the table and vis from any previous tables or errors:
  div = document.getElementById("table");  
  while (div.hasChildNodes()) { div.removeChild(div.lastChild); }
  div = document.getElementById("vis");
  while (div.hasChildNodes()) { div.removeChild(div.lastChild); }
  
  //Check if this is a new crawl, or a history crawl.
  if (document.getElementById("history").value != "blank"){
    try {
      //For History crawl's we simply pull the response data from localStorage.
      results = JSON.parse(localStorage.getItem(document.getElementById("history").value));
      terminated = results.Termination;
      table_build(true);
      vis_count = results.Count;
      visualization(true);
    }
    //Error in case of invalid JSON stored in localStorage.
    catch(err){
      results = {};
      results.Result = 11;
      results.Result_text = "localStorage data has been corrupted, please 'Clear Search History' to remove data.";
      error_report(results);
    }
  }
  
  //If not a history crawl, kick off a new web_crawl with user input parameters.
  else{
    //Temporarily add a comment to screen that web_crawl is underway to alert user
    //that all is well on a overly long web_crawl.
    div = document.getElementById("table");
    cell = document.createElement("caption");
    cell.setAttribute("id", "vis_header");
    text = document.createTextNode("One Moment, WebCrawler is Crawling...");
    cell.appendChild(text);
    div.appendChild(cell);
    cell = document.createElement("img");
    cell.setAttribute("src", "IMG/in_prog.gif");
    cell.setAttribute("id", "clock");
    div.appendChild(cell);

    //Check search criteria against local storage in case search has been preformed previouslly.
    if(local_avail) {
      var i, found = false;
      for (i = 0; i < localStorage.length; i++){
      //Due to shared domain www.engr.oregonstat.edu, confirm Omega team storage is used.
        if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
          var loc_data = JSON.parse(localStorage.getItem(localStorage.key(i)));
          var new_method = "DF";
          var new_url = document.getElementById("url").value;
          //Add scheme if necessary.
          if (new_url.substring(0,4) != "http") {new_url = loc_data.Data[0].url.split("//")[0] + "//" + new_url; }
          //Add final slash if necessary.
          if (new_url.substr(new_url.length - 1) != "/" && loc_data.Data[0].url.substr(loc_data.Data[0].url.length - 1) == "/"){
            new_url += "/";
          }
          //Assign search type.
          if (document.getElementById("method").checked) { new_method = "BF"; }

          //Check if search already exists as is, and if so use historic data instead of new web crawl.
          if (new_url == loc_data.Data[0].url && new_method == loc_data.Method && document.getElementById("max").value == loc_data.Requested && document.getElementById("term").value == loc_data.Term_Text){
            results = loc_data;
            terminated = results.Termination;
            table_build(true);
            vis_count = results.Count;
            visualization(true);
            return;
          }
        }
      }
    }

    //Initate a new HTTP request to PHP middleware.
    var http_request = new XMLHttpRequest();
    var request_url = "https://web.engr.oregonstate.edu/~olsoeric/CS419/Omega/Crawler/process.php?";
  
    //Add query parameters per user input:
    request_url += "start=" + encodeURIComponent(document.getElementById("url").value);
    request_url += "&max=" + document.getElementById("max").value;
    request_url += "&method=";
    if (document.getElementById("method").checked) { request_url += "BF"; }
    else { request_url += "DF"; }
    if (document.getElementById("term").value != "") { request_url += "&term=" + document.getElementById("term").value; }

    //Make request and evalute response.
    http_request.open('GET', request_url);
    http_request.send();
    http_request.onreadystatechange = function () {
      if (this.readyState === 4) {
        try{
          results = JSON.parse(this.responseText);
          if (results.Result == 0){
            //Display valid results in table/visualization.
            terminated = results.Termination;
            table_build(true);
            vis_count = results.Count;
            visualization(true);
            //And if localStorage is available save results for Search History.
            if(local_avail) {
              var i, found = false;
              for (i = 0; i < localStorage.length; i++){
                //Due to shared domain www.engr.oregonstat.edu, confirm Omega team storage is used.
                if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
                  var loc_data = JSON.parse(localStorage.getItem(localStorage.key(i)));
                  //Check if search already exists as is, and if so do not store new results.
                  if (results.Data[0].url == loc_data.Data[0].url && results.Method == loc_data.Method && results.Requested == loc_data.Requested && results.Term_Text == loc_data.Term_Text){
                    found = true;
                  }
                }
              }
              //If no matching historic data is found, add new search to local history:
              if (!found){
                localStorage.setItem("omega_spr_16_" + local_count, this.responseText);
                local_count++;
                historyBuild();  //Redraw history dropdown with latest search added.
              }
            }
          }
          //Otherwise if invalid return, print error message.
          else {
            error_report(results);
          }
        }
        catch(err){
          results = {};
          results.Result = 12;
          results.Result_text = "Error with response from Web Crawler, please try again.";
          error_report(results);
        }
      }
    }
  }
}
/******* End of new_crawl() *******/



/************************************************************
 * Function simply prints the Error Code, and Error Text from the 'results' JSON object parameter to
 * screen.  Will clear any previous table/visualization before presenting error.
 ************************************************************/
function error_report(results){
  var page = document.getElementById("table");
  var cell, text;

  //Clear the table and vis from any previous tables or errors:
  while (page.hasChildNodes()) { page.removeChild(page.lastChild); }
  page = document.getElementById("vis");
  while (page.hasChildNodes()) { page.removeChild(page.lastChild); }

  //Write error code and message to page:
  cell = document.createElement('p');
  text = document.createTextNode("Error Received, Error Code = " + results.Result);
  cell.appendChild(text);
  page.appendChild(cell);
  cell = document.createElement('p');
  text = document.createTextNode("Error Message = " + results.Result_text);
  cell.appendChild(text);
  page.appendChild(cell);
}
/******* End or error_report() *******/



/************************************************************
 * Function takes the valid web crawl data found in the 'results' JSON object parameter and builds
 * an output table including 
 ************************************************************/
function table_build(full){
  var page = document.getElementById("table");
  var table = document.createElement("table");
  var x, y, div, row, cell, link, text;

  //Clear the table from any previous tables or errors:
  while (page.hasChildNodes()) { page.removeChild(page.lastChild); }

  if (full){
    //Add Collapsable icon.
    div = document.createElement("img");
    div.setAttribute("src", "IMG/Collapse.JPG");
    div.setAttribute("onClick", "table_build(false)")
    page.appendChild(div);

    //Build the results table header:
    cell = document.createElement("caption");
    text = document.createTextNode("Web Crawler Search Results - Data Table");
    cell.appendChild(text);
    table.appendChild(cell);

    //Build the results table headers:
    div = document.createElement("thead");
    row = document.createElement("tr");
    cell = document.createElement("th");
    text = document.createTextNode("Page #");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("URL");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("Page Title");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("Parent ID");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("Child IDs");
    cell.appendChild(text);
    row.appendChild(cell);
    div.appendChild(row);
    table.appendChild(div);

    //Build the actual data table (numbering starting at 1 for node ID instead of 0):
    div = document.createElement("tbody");
    for (x = 0; x < results.Data.length; x++){
      row = document.createElement("tr");
      cell = document.createElement("td");
      text = document.createTextNode(results.Data[x].ID + 1);
      cell.appendChild(text);
      //If termination word found on page turn cell borders red.
      if (terminated && x == results.Data.length - 1) { cell.setAttribute("class","term"); }
      row.appendChild(cell);
      cell = document.createElement("td");
      link = document.createElement("a");
      link.setAttribute("href",results.Data[x].url);
      link.setAttribute("target", "_blank");
      text = document.createTextNode(results.Data[x].url);
      link.appendChild(text);
      cell.appendChild(link);
      if (terminated && x == results.Data.length - 1) { cell.setAttribute("class","term"); }
      row.appendChild(cell);
      cell = document.createElement("td");
      text = document.createTextNode(results.Data[x].title);
      cell.appendChild(text);
      if (terminated && x == results.Data.length - 1) { cell.setAttribute("class","term"); }
      row.appendChild(cell);
      //Check for parent and print if found, otherwise leave blank.
      cell = document.createElement("td");
      if (results.Data[x].parent.length > 0){ text = document.createTextNode(parseInt(results.Data[x].parent) + 1); }
      else { text = document.createTextNode(""); }
      cell.appendChild(text);
      if (terminated && x == results.Data.length - 1) { cell.setAttribute("class","term"); }
      row.appendChild(cell);
      //Add children if needed, adjusting by 1 and comma seperating.
      cell = document.createElement("td");
      var temp_text = "";
      if (results.Data[x].child.length > 0){
        temp_text = parseInt(results.Data[x].child[0]) + 1;
        for (y = 1; y < results.Data[x].child.length; y++){
          temp_text += "," + (parseInt(results.Data[x].child[y]) + 1);
        }
      }
      text = document.createTextNode(temp_text);
      cell.appendChild(text);
      if (terminated && x == results.Data.length - 1) { cell.setAttribute("class","term"); }
      row.appendChild(cell);
      div.appendChild(row);
    }
    table.appendChild(div);

    //Add output to page:
    page.appendChild(table);
  }

  //Otherwise if table is minimized:
  else{
    //Add Expandable icon.
    div = document.createElement("img");
    div.setAttribute("src", "IMG/Expand.JPG");
    div.setAttribute("onClick", "table_build(true)")
    page.appendChild(div);

    //Build the results table header:
    cell = document.createElement("caption");
    text = document.createTextNode("Web Crawler Search Results - Data Table");
    cell.appendChild(text);
    page.appendChild(cell);
  }

  //Add a note to explain red border on terminated searches.
  if (terminated && full) {
    cell = document.createElement("p");
    text = document.createTextNode("Red border indicates Web Crawl found termination keyword '" + results.Term_Text + "' on this page.");
    cell.appendChild(text);
    page.appendChild(cell);
  }
}
/******* End of table_build() *******/



/************************************************************
 * Temp Function to draw visual representation of web_crawl, will be updated upon algorithm completion.
 ************************************************************/
function visualization(full){
  var temp_array = [];
  var temp_title = "";
  var i;

  if (full){
    //Invoke tree.js algorithm to calculate X,Y coordinates for visualization.
    var visTree = new TreeSpace();
    visTree.loadTreeNodes(results);
    visTree.positionTree();

    //In rare circumstances tree.js returns some negative x data, this is corrected here.
    var shift_right = 0;
    for (i = 0; i < results.Count; i++){
      if (visTree.nodes[i].x < shift_right) { shift_right = visTree.nodes[i].x; }
    }
    shift_right = -1 * shift_right;
    if (shift_right > 0){
      for (i = 0; i < results.Count; i++){
        visTree.nodes[i].x = visTree.nodes[i].x + shift_right + 50;
      }
    }
  
    ///Reset node_locations, and prepare for data.
    node_locations = [];
    for (i = 0; i < results.Count; i++){
      node_locations.push(new Array());
    }
  
    //Capture required height/width and assign node locations to new array.
    vis_height = 0;
    vis_width = 0;
    for (i = 0; i < visTree.nodes.length; i++){
      vis_width = Math.max(vis_width, visTree.nodes[i].x + 50);
      node_locations[i].push(visTree.nodes[i].x);  //The X coordinate
      vis_height = Math.max(vis_height, visTree.nodes[i].y);
      node_locations[i].push(visTree.nodes[i].y);  //The Y coordinate
    }
    //Add buffer to right/below extreme node position (Level Sep of 130 for key + 50 for space at bottom).
    vis_height += 180;

    //Check to ensure canvas will be at minimum 720px wide, otherwise set to 720 and recenter:
    center_adjust = 0;
    if (vis_width < 720){
      var offset = 720 - vis_width;
      vis_width = 720;
      center_adjust = (offset / 2);
    }
  
    //Add parent location to array for the purposes of line, the final array will house:
    //[X, Y, PX, PY] where X/Y is the coordinates of the node, and PX/PY are the coordinates of parent.
    node_locations[0].push(0);
    node_locations[0].push(0);
    //Starting with 1, as node 0 has no parent.
    for (i = 1; i < node_locations.length; i++){
      node_locations[i].push(node_locations[results.Data[i].parent[0]][0]);  //Push X coord of parent.
      node_locations[i].push(node_locations[results.Data[i].parent[0]][1]);  //Push Y coord of parent.
    }

    //Finally add a Title & URL to each node to be printed with vis.
    for (i = 0; i < node_locations.length; i++){
      temp_title = results.Data[i].title;
      if (temp_title.length > 12) {
        temp_title = temp_title.substring(0,9) + "...";
      }
      node_locations[i].push(temp_title);  //Push Page Title of Node.
      node_locations[i].push(results.Data[i].title);
      node_locations[i].push(results.Data[i].url);
    }


    //Set global data to true.
    data_avail = true;
  }
  else{ data_avail = false; }
  
  //Actually draw visulization.
  new_vis();
}
/******* End of visualization() *******/



/************************************************************
 * Following functions provide visualization controls (play, pause, etc)
 ************************************************************/
//Restart player at 1st node.
function cont_reset(){
  vis_count = 1;
  new_vis();
  cont_pause();
}

//Move back one step and pause.
function cont_back(){
  if (vis_count > 1) { 
    vis_count--;
    new_vis();
  }
  cont_pause();
}

//Pause or restart an in flight play.
function cont_pause(){
  //If currently in play mode then pause player.
  if (vis_player != null){
    clearInterval(vis_player);
    vis_player = null;
  }
}

//Start a play of the crawl process at the currently location (or start over if vis complete).
function cont_play(){
  //Do nothing unless player is paused and can be started
  if (vis_player == null){
  //Play from current drawn board, unless full in which case start over from 0.
    if (vis_count < node_locations.length){
      vis_count++;
      new_vis();
      vis_player = setInterval(player, 1300);
    }
    else {
      vis_count = 1;
      new_vis();
      vis_player = setInterval(player, 1300);
    }
  }
}

//Actually creates timebound function to re-draw every 1.3 seconds.
function player(){
  if (vis_count < node_locations.length){
    vis_count++;
    new_vis();
  }
  else{
    cont_pause();
  }
}

//Moves one step forward and pauses.
function cont_fwd(){
  if (vis_count < node_locations.length){
    vis_count++;
    new_vis();
  }
  cont_pause();
}

//Jumps to full visualization and pauses.
function cont_end(){
  vis_count = node_locations.length;
  new_vis();
  cont_pause();
}



/************************************************************
 * Function is used to prevent users from entering data, and also choosing a History Search.  Only
 * one or the other is allowed, so when the History drop down is used, all other fields become disabled
 * and conversely when history drop down is cleared, the reamining input files are re-enabled.
 ************************************************************/
function lockInput(){
  var cell;
  //Check if change is to a history item, or to blank.  Lock input on history, re-enable on blank.
  cell = document.getElementById("history");
  if(cell.value != "blank"){
    //Clear and disable Starting URL
    cell = document.getElementById("url");
    cell.value = "";
    cell.setAttribute("disabled","disabled");
    //Clear and disable Max Pages
    cell = document.getElementById("max");
    cell.value = "";
    cell.setAttribute("disabled","disabled");
    //Clear and disable Terminate Word/Phrase
    cell = document.getElementById("term");
    cell.value = "";
    cell.setAttribute("disabled","disabled");
    //Clear and disable Method
    cell = document.getElementsByName("method");
    cell[0].checked = false;
    cell[0].disabled = true;
    cell[1].checked = false;
    cell[1].disabled = true;
  }
  else{
    //Re-enable Starting URL
    cell = document.getElementById("url");
    cell.removeAttribute("disabled");
    //Re-enable Max Pages
    cell = document.getElementById("max");
    cell.removeAttribute("disabled");
    //Re-enable Terminate Word/Phrase
    cell = document.getElementById("term");
    cell.removeAttribute("disabled");
    //Re-enable and reset Method
    cell = document.getElementsByName("method");
    cell[0].disabled = false;
    cell[0].checked = true;
    cell[1].disabled = false;    
  }
}
/******* End of lockInput() *******/



/************************************************************
 * Function populates the Search History drop down with any historic searches saved to localStorage.
 ************************************************************/
function historyBuild(){
  //Changes only necessary if localStorage is available.
  if (local_avail){
    var section, cell, text;  //Document elements
    var i;  //Loop counter
    var result; //JSON object container from historic search.
    section = document.getElementById("history");

    //Clear the Select:
    while (section.hasChildNodes()) { section.removeChild(section.lastChild); }
  
    //Generate blank option for new searches.
    cell = document.createElement("option");
    text = document.createTextNode("");
    cell.appendChild(text);
    cell.setAttribute("value", "blank");
    section.appendChild(cell);

    //Add historic searches found in localStorage
    for (i = 0; i < localStorage.length; i++){
      //Due to shared domain www.engr.oregonstat.edu, confirm Omega team storage is used.
      if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
        try {
          result = JSON.parse(localStorage.getItem(localStorage.key(i)));
          cell = document.createElement("option");
          //Generate Dropdown option in format "URL; Max:##; <Term:'text'>; Meth:BF|DF"
          var temp_text = result.Data[0].url.split("//")[1] + "; Max:" + result.Requested + "; ";
          if (result.Term_Text != "") { temp_text = temp_text + "Term:'" + result.Term_Text + "'; "; }
          temp_text = temp_text + "Method:" + result.Method;
          text = document.createTextNode(temp_text);
          cell.appendChild(text);
          cell.setAttribute("value", localStorage.key(i));
          section.appendChild(cell);
        }
        catch(err){
          results = {};
          results.Result = 11;
          results.Result_text = "localStorage data has been corrupted, please 'Clear Search History' to remove data.";
          error_report(results);
        }
      }
    }
  }
}
/******* historyBuild() *******/



/************************************************************
 * Function removes any localStorage items associated with the Omega project.
 ************************************************************/
function clear_history(){
  //Changes only necessary if localStorage is available.
  if (local_avail){
    var i;

    for (i = 0; i < localStorage.length; i++){
      //Only remove localStorage items associated with this project.
      if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
        localStorage.removeItem(localStorage.key(i));
        i--;  //Move counter back one to account for now missing record.
      }
    }
  reset();
  }
}
/******* clear_history() *******/



/************************************************************
 * Onload() function to confirm Browser support for localStorage, set related Global variables,
 * and setup default Search History dropdown based on finding.
 ************************************************************/
window.onload = function() {
  if (typeof(Storage) !== "undefined"){
    var i;

    //Set global variable indiciating browser supports localStorage
    local_avail = true;

    //Considering other projects may be housed on same web.engr.oregonstat.edu, and user may not have
    //cleared localStorage, need to count how many 'Omega' items are stored in local storage.
    for (i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
        local_count++;
      }
    }

    //Add Search History items to drop down.
    historyBuild();
  }
  else{
    //If no local storage, note this in Search History dropdown.
    var section, cell, text;
    section = document.getElementById("history");
    cell = document.createElement("option");
    text = document.createTextNode("~~Browser Version/Settings Does Not Support Data Storage~~");
    cell.appendChild(text);
    cell.setAttribute("selected","selected");
    cell.setAttribute("value", "blank");
    section.appendChild(cell);
  } 
}
/******* End of onload() function *******/