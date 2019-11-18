/* This file is used to parse the frequent itemsets. The frequent itemsets already
formatted as a line of numbers with the support at the end of each line, set off
with a hashtag. This reads in the contents of each file, and outputs a list of
corresponding attribute desciprtions for each one.*/

// We don't edit the file that is passed in; instead, we read in all the lines,
// and for each line, we output the attribute descriptions for each attribute

// THINGS WE NEED:
// MetaDataFile Path/Info
// File path to output
// Each of the FI sets - All begin with AE_crowdCode

const fs = require('fs');
var path = require("path");

// Path to directory with xml files we wish to iterate through
// Currenlty, the directory is the directory main.js is running in
var directoryPath = path.join(__dirname);
// Make a list of xml files
var fileList = [];
fs.readdirSync(directoryPath).forEach(file =>{
  var p = path.parse(file);

  // Make sure it is not a modified output file
  if((p.name).includes("output") && !(p.name).includes("mod")){
    //console.log(p.name);
    fileList.push(file);
  }

})

// We need to obtain all the metadata info
var attributeMap = new Map();
var queryMap = new Map();

var metaData = fs.readFileSync("attributeMETAdata_crowdCode.txt");
var data =  (metaData.toString()).split("\n");

for(var q = 0; q < data.length; q++){

  var idNo, desc, qury;
  var dataPieces = data[q].split(" ");
  // If we are on a row with an attribute ID and description, then we want to
  // store that information
  if(!isNaN(dataPieces[0]) && dataPieces[0] != ""){
    idNo = dataPieces[0];
    dataPieces = data[q].split(idNo + " ");
    desc = dataPieces[1];
  }
  else{
    qury = data[q];
  }
  // Store the info
  attributeMap.set(idNo, desc);
  queryMap.set(idNo, qury);

}

// Empty the contents of any files whose names contain "output" and "mod";
for(var i = 0; i < fileList.length; i++){
  var newFileName = fileList[i].split(".")[0] + "_mod.txt";
  fs.writeFileSync(newFileName, "");
}

// Now we are ready to create our modified output text files
var stream;
for (var i = 0; i < fileList.length; i++){

  var contents = fs.readFileSync(fileList[i]);
  var databaseLines = (contents.toString()).split("\n");

  for(var j = 0; j < databaseLines.length; j++){

    // If it is an FI, then we want to parse the info in the FI so we can
    // output the attribute info
    while(databaseLines[j] != undefined && !(databaseLines[j]).includes(".xml")){
      // Get all the attributes
      var allAttributes = (databaseLines[j]).split(" #")[0];

      // We create a new file that is modified with this information
      var newFileName = fileList[i].split(".")[0] + "_mod.txt";

      if(allAttributes != "\n"){

        // Write the FI set to the new file
        stream = fs.writeFileSync(newFileName, allAttributes + "\n",  {flag:'a'});

        var indivAttributes = allAttributes.split(" ");
        for(var k = 0; k < indivAttributes.length; k++){

          if (indivAttributes[k] != ""){
              // Output the attribute desc and qury for each attribute
              stream = fs.writeFileSync(newFileName, indivAttributes[k] + " "
                          + attributeMap.get(indivAttributes[k]) + "\n",  {flag:'a'});
              stream = fs.writeFileSync(newFileName, queryMap.get(indivAttributes[k]) + "\n",  {flag:'a'});
          }
        }
      }
      j++;
    }
  }

  // Now just output the xml files used to create FIs in the original file
  for(var j = 0; j < databaseLines.length; j++){
    // Once we're done putting all the attribute info in for each query, then
    // we write the names of the xml files to the bottom of the modified
    // output file.
    var fileName = fileList[i].split(".")[0] + "_mod.txt";
    if (databaseLines[j] != undefined && (databaseLines[j]).includes(".xml")){
      stream = fs.writeFileSync(fileName, databaseLines[j] + "\n", {flag:'a'});
    }
  }


}
