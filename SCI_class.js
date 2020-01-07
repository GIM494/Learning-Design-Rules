
var http = require("http");
var fs = require('fs');
var et = require('elementtree');
var sciFncs = require('./SCI_functions.js');
var XML = et.XML;
var ElementTree = et.ElementTree;
var element = et.Element;
var subElement = et.SubElement;

exports.outputMetaData = function(allAttributes, outputFile, queryMap){

    var entries = Array.from(allAttributes.entries());
    var queries = Array.from(queryMap.entries());

    var data = "";

    for(var x = 0; x < entries.length; x++){
      // Just while debugging is happening; remove after last queries
      // developed

        data += entries[x][1] + " " + entries[x][0] + "\n" + queries[x][0] + "\n";
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

// Note: the xPath queries provided in customQueries double as the
// attribute description and command
exports.findCustomRelations = function(id_start, customQueries, attributeList, queryMap){

  for (var i = 0; i < customQueries.length; i++){

    if(!attributeList.has(customQueries[i])){

      attributeList.set(customQueries[i], id_start.id);
      queryMap.set(customQueries[i], id_start.id);

      id_start.id += 1;
    }
  }
}

exports.addCustomRelations = function(allAttributes, customQueries, classGroupings,
                                            analysisFileName, classLocations,
                                            parentInfo, fileAnalysisMap, dataMap){

  var parentClass = classGroupings[classGroupings.length-1];
  var classTree;

  // Used to keep track of the children classes about which we've already
  // collected data
  var classesVisited = [];

  var index = 0;

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

      // Each xml file might contain multiple classes, so just because a class
      // is in the file, doesn't mean that it is the one that we want, so
      // we need to check that the filename is in classGroupings
      if(classGroupings.includes(childName) && !classesVisited.includes(childName)){
        classesVisited.push(childName);

        // Get the list of attributes for this class
        let fileN = analysisFileName + "_subClassOf" + parentClass + ".txt";
        var entry = (dataMap.get(fileN));

        // Go through each of the customQueries. If the customQuery is present
        // in this class, then add its attribute id to the list of attributes
        // for the class
        for (var k = 0; k < customQueries.length; k++){
          let query = subCL[j].findall(customQueries[k]);

          // If we found this customQuery, then we add it to the list of
          // attribute for this class
          if(query != null && index < entry.length){

            if(allAttributes.has(customQueries[k]) &&
                 !entry[index].includes(allAttributes.get(customQueries[k]))){

                 entry[index].push(allAttributes.get(customQueries[k]));
                 dataMap.set(fileN, entry);
                 entry = dataMap.get(fileN);

               }
             }
          }
          // Increment index into set of entries for this database
          index++;
        }

      }
    }
  //console.log(newMap);
}

exports.findParentChildRelations = function(id_start, classGroupings, attributeList, classLocations, parentInfo, queryMap){

  var parentClass = classGroupings[classGroupings.length-1];
  var subCLfncs = [];
  var classTree;
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

                var command = "//src:function[src:annotation/src:name/text()=\"Override\""
                              + "and src:name/text()=\"" + matchingFunctions[m]
                              + "\"]";
                //console.log(command);

                attributeList.set(name, id_start.id);
                queryMap.set(command, id_start.id);

                id_start.id += 1;
              }
              name = "";

            }
            matchingFunctions.length = 0;
            matchingFunctions = [];
          }
        }

        // Finds attributes having to do with the annotations above the class
        sciFncs.findClassAnnotations(subCL[j], attributeList, id_start, queryMap);

        // Finds attributes having to do with the constructors in the
        // class
        sciFncs.findConstructors(subCL[j], attributeList, id_start, queryMap);

        // Finds attributes having to do with member variables
        sciFncs.findMemberVars(subCL[j], attributeList, id_start, queryMap);

        // Finds attributes having to do with class implementations
        sciFncs.findImplements(subCL[j], attributeList, id_start, queryMap);

        // Finds attributes about class visibility and class functions
        sciFncs.findClsFunctions(subCL[j], attributeList, id_start, queryMap);

      }
    }
  }

}

exports.addParentChildRelations = function(allAttributes, classGroupings,
                                            analysisFileName, classLocations,
                                            parentInfo, fileAnalysisMap, dataMap){

  var parentClass = classGroupings[classGroupings.length-1];
  // This array is to keep track of what functions are overridden in
  // the child class; we assume they are overridden, but once we
  // find a class that doesn't override a parent function we set that
  // element to False
  var subCLfncs = [];
  var classTree;

  // Empty the analysisFile first in case anything has been written before
  /*
  fileN = analysisFileName + "_subClassOf" + parentClass + ".txt";
  var d = "";
  fs.writeFile(fileN, d, (err) => {
  // In case of a error throw err.
  if (err) throw err;
  });
  */

  // Used to keep track of all the files we have accessed
  var listOfFiles = [];

  // Used to keep track of the children classes about which we've already
  // collected data
  var classesVisited = [];

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
      if(classGroupings.includes(childName) && !classesVisited.includes(childName)){
        classesVisited.push(childName);
        //console.log(childName);

        if(parentInfo.get(parentClass) != undefined){

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

          // var data = finalList.join(" ") + "\n";

          // Place the data in the map...
          // If we already have an entry for this database, then we just
          // append the new information
          if (dataMap.has(fileN)){
             var entry = dataMap.get(fileN);

             entry.push(finalList);
             dataMap.set(fileN, entry);
           }
           // However, if we haven't yet had any entries for this database,
           // then we just set this data as the first entry
           else{

             var entry  = new Array();
             entry[0] = finalList;
             dataMap.set(fileN, entry);
           }

           /*
          var stream = fs.createWriteStream(fileN, {flags:'a'});
          stream.write(data);
          stream.end();
          */
        }

        attributes.length = 0;
        attributes = [];

        if (!listOfFiles.includes(f)){
          listOfFiles.push(f);
        }
      }
    }
  }// End of outermost for loop

    // Record that this file was used to contribute to this database
    var fileN = analysisFileName + "_subClassOf" + parentClass + ".txt";
    var newStuff = listOfFiles.join("\n");

    fileAnalysisMap.set(fileN, newStuff);


}

exports.outputFileAnalysisData = function(fileAnalysisMap){

  var entries = Array.from(fileAnalysisMap.entries());

  var fileN = "fileLocations.txt";
  var stream = fs.createWriteStream(fileN, {flags:'w'});

  for(var x = 0; x < entries.length; x++){

    stream.write(entries[x][0]);
    stream.write("\n");
    stream.write(entries[x][1]);
    stream.write("\n");

  }
}

// To change dataMap into its required output format where our data is in the
// format:
//[ ["nameOfFile.txt", "data that is going to be written into file"],
// ["nextFile.txt", "some other data"]]
exports.outputDatabases = function(databases){

  // Write new contents
  var finalFormat = new Array();
  for (var x = 0; x < databases.length; x++){

    var table = new Array();
    // nameFile.txt
    var fileN = databases[x][0];
    table.push(fileN);
    //var stream = fs.createWriteStream(fileN, {flags:'a'});
    var dataWritten = "";
    for(var y = 0; y < databases[x].length; y++){
      var data = databases[x][y];

      if(data != fileN){
        for(const arr of data){
          for(const num of arr){
            dataWritten = dataWritten + num + " ";
          }
          dataWritten += "\n";
        }
        table.push(dataWritten);
      }
    }
    //console.log(table);
    finalFormat.push(table);
  }

  return finalFormat;
}



// For testing purposes
exports.outputToFileDatabses = function(databases){
  //console.log(databases);

  // Clear existing contents:
  for (var x = 0; x < databases.length; x++){

    var fileN = databases[x][0];
    //console.log(fileN);
    fs.truncate(fileN, 0, function(){});
  }

  // Write new contents
  for (var x = 0; x < databases.length; x++){

    var fileN = databases[x][0];
    var stream = fs.createWriteStream(fileN, {flags:'a'});

    for(var y = 0; y < databases[x].length; y++){
      var data = databases[x][y];

      if(data != fileN){
        for(const arr of data){
          for(const num of arr){
            stream.write(num + " ");
          }
          stream.write("\n");
        }
      }
    }
    stream.end();
  }
}
