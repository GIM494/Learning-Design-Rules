# Learning Design Rules
This repository contains the code used to implement an algorithm designed to learn about design choices and implementations for a project base. There are two central files in this repository: one contains the program driver, while the other contains the implementations for the functions used in the program files. All updates made to the current methodology are made in the forms of commits to the code. The proper inputs for the program and a description of the driver follow.

## Program function
The algorithm finds all sets of parent-child classes and parent-child-grandchild classes*, and then outputs information about the attributes of each set to distinct databases. Once these databases have been created, an Association Rule Mining (ARM) algorithm can be run on the databases to generate frequent itemsets.

_This program MUST be run using python3.6 or later_

*Changing the value of the DEPTH variable alters how deep in the family hierarchy the algorithm goes. For instance, if DEPTH changed to 1, then databases would only be created for sets of parent-child classes. Alternatively, if DEPTH changed to 3, then databases would be created for sets of parent-child, parent-child-grandchild, and parent-child-grandchild-greatGrandchild classes.

## Program Driver
The program driver is found in the subclassInterface_attrEncoding.py file. This is the only piece of code in which the user might have to change anything. This file will create the databases fed later into the ARM algorithm for frequent itemset generation.

## Input
The algorithm is specifically tailored to mining project files that have been annotated using srcML, which is a specific type of XML. It will not run correctly if the file supplied has not been encoded using srcML.

There are 3 file names and a variable name that must be correctly supplied in the driver in order for the program to run correctly:
  1. `classFilename` - This is the name of the srcML document that contains all of the code for the entire project. It is the file from which all attributes will be encoded. If the code for a file is not in this XML file, then any new/different attributes that could have been encoded as a result of that code will not exist. Make sure this file has ALL the code from which attributes should be derived.
  2. `peripheralClassFile` - For our algorithm, this should be the same as the classFilename. However, it could theoretically differ from the classFilename. The algorithm will not produce the same results if the two file names differ. 
  3. `outputFile` - This is the name of the file to which the metadata for the attributes will be output. 
  4. `analysisFileName` - For each set, a different database is created. The string assigned to this variable name represents the "start" of the name for each of the databases. 


  

