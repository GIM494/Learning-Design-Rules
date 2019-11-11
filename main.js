var http = require("http");
var fs = require('fs');
var path = require("path");
var et = require('elementtree');
var sci = require('./SCI_class.js');

var XML = et.XML;
var ElementTree = et.ElementTree;
var element = et.Element;
var subElement = et.SubElement;

//var namespace = {"src" : "http://www.srcML.org/srcML/src"};

var outputFile = "attributeMETAdata_crowdCode.txt";
var analysisFileName = "AE_crowdcode";

var id_start = 1;
var allAttributes = new Map();

// This is to keep track of the XML queries used for each of the attributes
var queryMap = new Map();

// This variable will always be used when trying to obtain the
// root for each file
var classRoot;
// These are used to store the child-parent and interface-implementation
// pairs that are found
var childParent = new Map();

// Used to keep track of where certain classes had been seen
var classLocations = new Map();

// Used to keep track of what xml files were used to create what databases
var fileAnalysisMap = new Map();

// This class is used later to group info about parent classes
class classNode {
    constructor() {
        this.name = "NOT VALID";
        this.pathToFile = "NOT VALID";
        this.totalChildren = 0;
        this.children = [];
        this.functions = [];
    }

    // Adding a method to the constructor
    printClass() {
      console.log(this.name);
      console.log(this.pathToFile);
      console.log(this.totalChildren);
      console.log(this.children);
      console.log(this.functions);
    }
}

// To check if a class is a parentClass we can simply check to see if
// childParent[parentName] === undefined; if so, then it is not a parent;
// otherwise, it is a parent name.

// The basic idea of the algorithm is to extract all the attributes from a
// single base class, and then look for those attributes in a set of classes
// that are related to the base class in some way. Only attributes found in
// both the base class and the related (peripheral) classes are output to
// the database that is fed to the FP Growth algorithm.

// Our first step is to make a list of all the parent classes in the
// code base; to do this, we need to go through every srcML fle
// in the directory and find the names of all the parentClasses.

// Path to directory with xml files we wish to iterate through
// Currenlty, the directory is the directory main.js is running in
var directoryPath = path.join(__dirname);
// Make a list of xml files
var fileList = [];
fs.readdirSync(directoryPath).forEach(file =>{
  if(file.substring(file.indexOf('.')) === ".xml"){
    fileList.push(file);
  }
})

// For each of the XML files in the directory we need to find he childParent
// pairs and record their file locations using the makePairsList() function
for (var i = 0; i < fileList.length; i++){

  var data = fs.readFileSync(fileList[i]).toString();
  classRoot = (et.parse(data));
  sci.makePairsList(classRoot, childParent, classLocations);

}

// This is a global variable that controls how "deep" the chlid-parent
// relationships can extend
var DEPTH = 2;

// This map keeps each of the groupings that we make
var groupList = new Map();

// Now we need to generate class groupings based off of their inheritance
// structure
for (const supa of childParent.keys()) {

  sci.addChildren(supa, childParent, supa, DEPTH, groupList);
  (groupList.get(supa)).push(supa);

}


//Now, we're going to populate an information list about the parents defined
// in this code, so that attributes can be generated
var parentInfo = new Map();
// We already have all the fileNames, so all we have to do now go through
// each file and pull out the parent attributes
for (var i = 0; i < fileList.length; i++){

  var data = fs.readFileSync(fileList[i]).toString();
  classRoot = (et.parse(data));

  // We're going to pull out all the parent info
  var cls = classRoot.findall(".//class");

  for(var j = 0; j < cls.length; j++){

    var ptName = cls[j].find('name');
    var parentName;

    if(ptName !== null && ptName == ''){
      parentName = (ptName.find('name')).text;
    }
    else if(ptName !== null){
      parentName = ptName.text;
    }

    // If class name is not found, then we know it was defined and
    // not simply imported into the code
    if(parentName != null){

      if(childParent.get(parentName) !== undefined){
        //console.log(parentName);
        var functionList = [];
        // Get all the functions in this class
        var fncs = cls[j].findall('block/function');
        for(var k = 0; k < fncs.length; k++){
          // Get the function name
          var fncName = (fncs[k].find('name')).text;
          // Make sure we found a valid function name
          if(fncName != ''){
            (functionList).push(fncName);
          }
        }

        // Sort all the functions for easy comparison
        (functionList).sort();


        parentInfo.set(parentName, {name:parentName,
                                  totalChildren:(childParent.get(parentName)).length,
                                  children:childParent.get(parentName),
                                  pathToFile: fileList[i],
                                  functions: functionList});
      }
    }
  }
}

// Now we have all the information we need to generate the attributes
var id_start = {id : 0};
for (const group of groupList.keys()) {

  var merged = new Map(allAttributes,
                       sci.addParentChildRelations(id_start, groupList.get(group),
                       allAttributes, classLocations, parentInfo, queryMap));
  allAttributes = merged;

}

//console.log(queryMap);

//console.log(allAttributes);

// Output the metadata to a file
var outputFile = "attributeMETAdata_crowdCode.txt";
sci.outputMetaData(allAttributes, outputFile, queryMap);


for (const group of groupList.keys()){
  var grouping = groupList.get(group);
  sci.findParentChildRelations(allAttributes, grouping, analysisFileName,
                               classLocations, parentInfo, fileAnalysisMap);
}

sci.outputFileAnalysisData(fileAnalysisMap);
