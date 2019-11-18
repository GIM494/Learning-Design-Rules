/* This script is used to run the algorithm that mines the database. Essentially,
it runs the proper command line prompts to analyze the databases and output the
frequent itemsets */

const fs = require('fs');
var path = require("path");
var exec = require('child_process').execSync;
const readline = require('readline');

// Path to directory with xml files we wish to iterate through
// Currenlty, the directory is the directory main.js is running in
var directoryPath = path.join(__dirname);
// Make a list of xml files
var fileList = [];
fs.readdirSync(directoryPath).forEach(file =>{
  var p = path.parse(file);
  //console.log(p.name);

  if((p.name).includes("AE_crowdcode")){
    fileList.push(file);
  }

})


// We read in all the Attribute Encoding database file names and the xml files
// that were used to create them from 'fileLocations.txt'. This txt file
// is structured such that each database (fileName ending in ''.txt') is
// followed immediately by the list of 'xml' files used to create that
// database.
var array = fs.readFileSync('fileLocations.txt').toString().split("\n");
// The way this map works is that the key is the .txt file name (database),
// and the corresponding value is a list of the xml files used to create
// the txt value.
var fileLocMap = new Map();
// Used as a local variable in order to record the database fileName as the
// key for the set of xml file names that follow it in fileLocations.txt
var aeFile;
for(let i in array) {

     // If it is the name of a database, then we want to keep it in this
     // local variable, and use it as the key in the map as we make a list
     // of the xml files that follow it
    if(array[i].split(".")[1] == "txt"){
        aeFile = array[i];
    }
    // If it is not a database name, then it is an xml file used to create
    // that database. Either (1) We have already recorded an xml file name
    // for this key (database name ); or (2) We have not yet read in/recorded
    // an xml file name for this key.

    // (1) If a list of xml files already exists for this
    // datbase, then we just append this file name to the end of the list
    else if (fileLocMap.has(aeFile)){
      if(array[i] != ""){
        var entry = fileLocMap.get(aeFile);
        entry.push(array[i]);
        fileLocMap.set(aeFile, entry);
      }
    }
    // (2) However, if we have not yet recorded an xml file name for this key,
    // then we need to add this key to the map with a value that is a list
    // that contains this first xml file name.
    else{
      if(array[i] != ""){
        fileLocMap.set(aeFile, [array[i]]);
      }
    }
}

 var SUPPORT = 60;
// We want to analyze each of the files in this list
for (var i = 0; i < fileList.length; i++){

  var prompt = "java -jar spmf.jar run FPMax " + fileList[i]
                + " output" + i + ".txt " + SUPPORT + "%";

    exec(prompt,
    function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }

    });

    // If we wanted to print out the result of the command prompt result
    // then we would uncomment this line
    //console.log(child.toString());

}



// Add xml files that FI's apply to, to bottom of output file
for(var i = 0; i < fileList.length; i++){

  // Add list of xml files to bottom of analysis file
  var f = "output" + i + ".txt";
  var stream = fs.createWriteStream(f, {flags:'a'});
  var arr = fileLocMap.get(fileList[i]);
  var data = "";

  for(var j = 0; j < arr.length; j++){
    data = data + arr[j] + "\n";
  }
  stream.write(data);
  stream.close();

}
