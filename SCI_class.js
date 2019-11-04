
var http = require("http");
var fs = require('fs');
var et = require('elementtree');
var sciFncs = require('./SCI_functions.js');
var XML = et.XML;
var ElementTree = et.ElementTree;
var element = et.Element;
var subElement = et.SubElement;



exports.outputMetaData = function(allAttributes, outputFile){

    var entries = Array.from(allAttributes.entries());
    var data = "";

    for(var x = 0; x < entries.length; x++){
      data += entries[x][1] + " " + entries[x][0] + "\n";
    }

    fs.appendFile(outputFile, data, (err) => {
    // In case of a error throw err.
    if (err) throw err;
    });
}

exports.makePairsList = function(classRoot, childParent, classLocations){

  var childName = "DOES NOT EXIST";
  var parentName = "DOES NOT EXIST";

  var cls = classRoot.findall('.//class');

    for(var i = 0 ; i < cls.length; i++){

     // Figure out what the child class's name is
     var chName = cls[i].find('name');
     //console.log(chName);
     if(chName == null){
       continue;
     }

     if(chName.text == null){
       childName = (chName.find('name')).text
     }
     else{
       childName = chName.text;

       if(childName != ''){
         classLocations[childName] = classRoot.find('[@filename]').get('filename');
       }

     }
     // If we can't find a name, then we go on to the next class in
     // the srcML file
     if(childName == ''){
       continue;
     }

     var ext = cls[i].find(".//super/extends");
     if (ext != null){

       var ptName = ext.find('name');

       if(ptName.text == ''){
         parentName = (ptName.find('name')).text;
       }
       else{
         parentName = ptName.text;
       }

       // If we can't find the parent name, then we go ahead append
       // and skip past this case
       if (parentName == null){
         continue;
       }

       if (!childParent.has(parentName)){
         childParent.set(parentName, [childName]);
       }
       else{
         childParent.get(parentName).push(childName);
       }
     }

   }

}


exports.addChildren = function(parent, childParent, groupID, currDepth, groupList){

  if (currDepth <= 0 || !childParent.has(parent)){
    return parent;
  }

  for (var i = 0; i < childParent.get(parent).length; i++){

    var nextChild = exports.addChildren((childParent.get(parent))[i], childParent, groupID, currDepth - 1, groupList);

    if (!groupList.has(groupID)){
      groupList.set(groupID, [nextChild]);
    }
    else{
      groupList.get(groupID).push(nextChild);
    }

  }

  return parent;
}


exports.addParentChildRelations = function(id_start, classGroupings, attributeList, classLocations, parentInfo){

  var parentClass = classGroupings[classGroupings.length-1];
  var subCLfncs = [];
  // Get all the children classes' info

  // This array is to keep track of what functions are overridden in
  // the child class; we assume they are overridden, but once we
  // find a class that doesn't override a parent function we set that
  // element to False

  for(var i = 0; i < classGroupings.length; i++){

    var f = classLocations[classGroupings[i]];

    if(f != undefined){
      f = f.split("\\")[(f.split("\\")).length - 1]
      f = f.split(".")[0] + ".xml";

      var data = fs.readFileSync(f).toString();
      classTree = et.parse(data);

    }
    else{
      continue;
    }

    var subCL = classTree.findall('.//class');
    var childName;
    for(var j = 0; j < subCL.length; j++){
      // Figure out what the child class's name is
      var chName = subCL[j].find('name');

      if(chName == null){
        continue;
      }

      if(chName.text == null){
        childName = (chName.find('name')).text
      }
      else{
        childName = chName.text;
      }
      // If we can't find a name, then we go on to the next class in
      // the srcML file
      if(childName == ''){
        continue;
      }

      // Each xml file might contain multiple classes, so just because setInterval(function () {
      // is in the file, doesn't mean that it is the one that we want, so
      // we need to check that the filename is in classGroupings
      if(classGroupings.includes(childName)){

        if(parentInfo.get(parentClass) != undefined){

          var parentFncsOverridden = new Array((parentInfo.get(parentClass).length)).fill(true);
          // This will contain a list of functions that are present in both
          // the parent class and the child class.
          var matchingFunctions;
          if (parentClass != childName){

            // First get a list of all the child functions
            var fncs = subCL[j].findall('block/function');

            for (var k = 0; k < fncs.length; k++){
              subCLfncs.push((fncs[k].find('name')).text);
            }

          subCLfncs.sort();

          // Then see what functions are in common between the two lists;
          // If there are matching functions, then matchingFunctions will
          // contain their names.
          matchingFunctions = subCLfncs.filter(element => (parentInfo.get(parentClass).functions).includes(element));

          subCLfncs.length = 0;

          }
          // Come here and output attribute about parent functions matching
          // Clear out matching functions here as well
          if(matchingFunctions != null){
            for (var m = 0; m < matchingFunctions.length; m++){

              var name = "class overrides function of name \""
                          + matchingFunctions[m]
                          + "\" in parent class";

              // Check if this attribute has been seen globally
              if(!attributeList.has(name)){
                attributeList.set(name, id_start.id);
                id_start.id += 1;
              }
              name = "";

            }
            matchingFunctions.length = 0;
            matchingFunctions = [];
          }
        }

        // Finds attributes having to do with the annotations above the class
        sciFncs.findClassAnnotations(subCL[j], attributeList, id_start);

        // Finds attributes having to do with the constructors in the
        // class
        sciFncs.findConstructors(subCL[j], attributeList, id_start);

        // Finds attributes having to do with member variables
        sciFncs.findMemberVars(subCL[j], attributeList, id_start);

        // Finds attributes having to do with class implementations
        sciFncs.findImplements(subCL[j], attributeList, id_start);

        // Finds attributes about class visibility and class functions
        sciFncs.findClsFunctions(subCL[j], attributeList, id_start);

      }
    }
  }

}


exports.findParentChildRelations = function(allAttributes, classGroupings,
                                            analysisFileName, classLocations,
                                            parentInfo){

  var parentClass = classGroupings[classGroupings.length-1];
  var subCLfncs = [];

  // Empty the analysisFile first in case anything has been written before
  fileN = analysisFileName + "_subClassOf" + parentClass + ".txt";
  var d = "";
  fs.writeFile(fileN, d, (err) => {
  // In case of a error throw err.
  if (err) throw err;
  });

  // Used to keep track of all the files we have accessed
  listOfFiles = [];

  // This array is to keep track of what functions are overridden in
  // the child class; we assume they are overridden, but once we
  // find a class that doesn't override a parent function we set that
  // element to False

  for(var i = 0; i < classGroupings.length; i++){

    var f = classLocations[classGroupings[i]];

    if(f != undefined){
      f = f.split("\\")[(f.split("\\")).length - 1]
      f = f.split(".")[0] + ".xml";

      var data = fs.readFileSync(f).toString();
      classTree = et.parse(data);

    }
    else{
      continue;
    }

    var attributes = [];
    var subCL = classTree.findall('.//class');
    var childName;
    for(var j = 0; j < subCL.length; j++){
      // Figure out what the child class's name is
      var chName = subCL[j].find('name');

      if(chName == null){
        continue;
      }

      if(chName.text == null){
        childName = (chName.find('name')).text
      }
      else{
        childName = chName.text;
      }
      // If we can't find a name, then we go on to the next class in
      // the srcML file
      if(childName == ''){
        continue;
      }

      // Each xml file might contain multiple classes, so just because setInterval(function () {
      // is in the file, doesn't mean that it is the one that we want, so
      // we need to check that the filename is in classGroupings
      if(classGroupings.includes(childName)){

        if(parentInfo.get(parentClass) != undefined){

          var parentFncsOverridden = new Array((parentInfo.get(parentClass).length)).fill(true);
          // This will contain a list of functions that are present in both
          // the parent class and the child class.
          var matchingFunctions;
          if (parentClass != childName){

            // First get a list of all the child functions
            var fncs = subCL[j].findall('block/function');

            for (var k = 0; k < fncs.length; k++){

              subCLfncs.push((fncs[k].find('name')).text);

            }

          subCLfncs.sort();

          // Then see what functions are in common between the two lists;
          // If there are matching functions, then matchingFunctions will
          // contain their names.
          matchingFunctions = subCLfncs.filter(element => (parentInfo.get(parentClass).functions).includes(element));

          subCLfncs.length = 0;

          }
          // Come here and output attribute about parent functions matching
          // Clear out matching functions here as well
          if(matchingFunctions != null){
            for (var m = 0; m < matchingFunctions.length; m++){

              var name = "class overrides function of name \""
                          + matchingFunctions[m]
                          + "\" in parent class";

              // Check if this attribute has been seen globally
              if(!allAttributes.has(name)){
                attributes.push(allAttributes.get(name));
              }
              name = "";
            }

            matchingFunctions.length = 0;
            matchingFunctions = [];

          }
        }

        // Adds attributes having to do with the annotations above the class
        sciFncs.addClassAnnotations(subCL[j], attributes, allAttributes);

        // Adds attributes having to do with the constructors in the class
        sciFncs.addConstructors(subCL[j], attributes, allAttributes);

        // Adds attributes having to do with the member variables in the class
        sciFncs.addMemberVars(subCL[j], attributes, allAttributes);

        sciFncs.addImplementations(subCL[j], attributes, allAttributes);

        // Adds attributes about class visibility and class functions
        sciFncs.addClsFunctions(subCL[j], attributes, allAttributes);

        // This is the file we will be outputting to
        fileN = analysisFileName + "_subClassOf" + parentClass + ".txt";

        // Output attributes found to database
        // Current FP Growth implementation will stop when it reads a newline
        // so we don't want it to output newlines when attributes is empty
        if(attributes.length > 0){
          // Remove duplicate elements from attributes
          var finalList = attributes.filter(function(elem, pos) {
            return attributes.indexOf(elem) == pos;
          })

          // By default the JavaScript sort() method will sort values as strings
          // in alphabetical ascending order; if numbers are sorted as strings,
          // then "6" is bigger than "542", so we have to supply a sort function
          // that we define
          function sortNumber(a, b) {
            return a - b;
          }

          // Sort the attributes we found in ascending order
          finalList.sort(sortNumber);

          //console.log(finalList);

          var data = finalList.join(" ") + "\n";

          fs.appendFile(fileN, data, (err) => {
          // In case of a error throw err.
          if (err) throw err;
          });

        }

        attributes.length = 0;
        attributes = [];

        if (!listOfFiles.includes(f)){
          listOfFiles.push(f);
        }
      }
    }
  }// End of outermost for loop

    // We need to put the path to the file at that contains this class
    // at the top of the file we are outputting to

    var fileN = analysisFileName + "_subClassOf" + parentClass + ".txt";
    var data = fs.readFileSync(fileN); //read existing contents into data
    var fd = fs.openSync(fileN, 'w+');
    var newStuff = listOfFiles.join("\n") + "\n";
    var buffer = new Buffer(newStuff);

    fs.writeSync(fd, buffer, 0, buffer.length, 0); //write new data
    fs.writeSync(fd, data, 0, data.length, buffer.length); //append old data

    fs.close(fd, (err) => {
      // In case of a error throw err.
      if (err) throw err;
    });

}
