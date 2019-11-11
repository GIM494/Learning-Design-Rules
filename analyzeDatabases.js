/* This script is used to run the algorithm that mines the database. Essentially,
it runs the proper command line prompts to analyze the databases and output the
frequent itemsets */

const fs = require('fs');
var path = require("path");
var exec = require('child_process').exec, child;
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

var fileLocMap = new Map();
// We read in all the Attribute Encoding database file names and the xml files
// that were used to create them from 'fileLocations.txt'
var array = fs.readFileSync('fileLocations.txt').toString().split("\n");
var aeFile;
for(i in array) {

    if(array[i].split(".")[1] == "txt"){
        aeFile = array[i];
    }
    else if (fileLocMap.has(aeFile)){
      if(array[i] != ""){
        var entry = fileLocMap.get(aeFile);
        entry.push(array[i]);
        fileLocMap.set(aeFile, entry);
      }
    }
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

  // Execute analysis
  child = exec(prompt,
    function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });

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
