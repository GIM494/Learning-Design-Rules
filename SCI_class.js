
var http = require("http");
var fs = require('fs');
var et = require('elementtree');
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


        // Now we look for other attributes in the class
        // First we will output all the annotations on a class
        var clsAnnotCandidate = subCL[j].findall('annotation');
        if (clsAnnotCandidate.length > 0){

          for(var k = 0 ; k < clsAnnotCandidate.length; k++){

            clsAnnot = clsAnnotCandidate[k];

            var annotArgs = clsAnnot.findall('.//argument/expr');

            var clsAnnotName = "class with annotation of \"@"
                                + (clsAnnot.find('name').text)
                                + "\"";

            if(annotArgs.length > 0){
              clsAnnotName += " with \n";
              for(var q = 0; q < annotArgs.length; q++){

                var node = annotArgs[q];

                for(var u = 0; u < (node._children).length; u++){

                  var ch = (node._children)[u];

                  if(ch.text != null){
                    clsAnnotName += ch.text;
                  }
                  else{
                    for(var v = 0; v < (ch._children).length; v++){
                      var c = (ch._children)[v];
                      if(c.text != null){
                        clsAnnotName += c.text;
                      }
                    }
                  }

                }

                clsAnnotName += "\n";
              }
              // Remove trailing newline
              clsAnnotName = clsAnnotName.slice(0, -1);
            }

            if(!attributeList.has(clsAnnotName)){

              attributeList.set(clsAnnotName, id_start.id);
              id_start.id += 1;

            }
          }
        }

        // What kind of constructor the class has
        // Choose last constructor because sometimes a default is defined and
        // then re-defined by another constructor (see Microtask.java)
        var constructor = subCL[j].findall('block/constructor');

        if(constructor.length > 0){
          for(var q = 0; q < constructor.length; q++){

            var constr = constructor[q];
            var constructorBody = constr.find('block');

            var memVarSet = [];
            var setTo = [];

            var constrBodyList = constructorBody.find(".*");
            if(constrBodyList != undefined){

              var name = "class with non-empty constructor";

              // Check if attribute has been seen globally
              if(!attributeList.has(name)){

                attributeList.set(name, id_start.id);
                id_start.id += 1;

              }

              // Constructor sets member variables
              var constructorExpr = constructorBody.findall('expr_stmt/expr');

              // If member variables are set...
              for(var v = 0; v < constructorExpr.length; v++){

                var expr = constructorExpr[v];
                name = expr.find('name/name');
                var op = expr.find('operator');

                // If there exists some expr of the form this.field = _____
                if( ((name != null) && (name.text == "this")) && ((op != null) && (op.text == "="))){

                  // Store the names of the member variables that are set
                  var memVar = ((expr._children[0])._children[2]).text;
                  memVarSet.push(memVar);

                  // Store names of things that member variables are set to
                  var setToName = expr._children[2];

                  // Double check that it's not set to a literal
                  if (setToName == null){
                    setToName = expr.find('literal');
                  }
                  if (setToName == null){
                    setTo.push("something other than null or variable name");
                  }
                  else{
                    setTo.push(setToName.text);
                  }

                }
              }
              // Output something like "constructor sets member variables x,y,z"
              if(memVarSet.length > 0){
                memVarSet.sort();

                for(var x = 0; x < memVarSet.length; x++){
                  memVarSet[x] = " member variable with name \"" + memVarSet[x] + "\"";
                }
                name = "constructor must set " + memVarSet.join(" and ");

                // Check if attribute has been seen globally
                if(!attributeList.has(name)){

                  attributeList.set(name, id_start.id);
                  id_start.id += 1;

                  name = "";

                }
              }

              // Check for calls to constructor
              var allExpr = constructorBody.findall('.//expr');
              for (var u = 0; u < allExpr.length; u++){

                var exp = allExpr[u];
                var op = exp.find('operator');
                var call = exp.find('call/name');

                if ((op != null) && (op.text == "new") && (call != null) && (call.text != null)){
                  name = "constructor must call constructor of class \"" + call.text + "\" ";
                  //console.log(name);

                  if(!attributeList.has(name)){

                    attributeList.set(name, id_start.id);
                    id_start.id += 1;

                    name = "";
                  }
                }
              }
            }
            // If the constructor didn't have a body, then we create an
            // attribute saying so
            else{
              name = "class has empty-body constructor";
              //console.log(name);
              // Check if this attribute has been seen globally
              if(!attributeList.has(name)){

                attributeList.set(name, id_start.id);
                id_start.id += 1;

                name = "";

              }
            }

            // Assume all parameters passed to the constructor are stored
            // as member variables
            // Assume that all parameters are stored as member variables
            var allParamsStored = true;
            var allParamTypes = "";
            var constrParamTypes = [];

            var paramsList = constr.findall('parameter_list/parameter/decl');

            for(var u = 0; u < paramsList.length; u++){

              var p = paramsList[u];
              var paramName = p.find('name');

              if(paramName.text != null && !setTo.includes(paramName.text)){
                allParamsStored = false;
              }

              var paramType = p.find('type/name');
              if(paramType.text == null){
                paramType = paramType.find('name');
              }

              if(!constrParamTypes.includes(paramType)){
                constrParamTypes.push(paramType.text);
              }
            }

            constrParamTypes.sort();

            for(var u = 0; u < constrParamTypes.length; u++){

              var t = constrParamTypes[u];
              allParamTypes = "\"" + t + "\"";

              if (t != constrParamTypes[-1]){
                allParamTypes = " and ";
              }
            }

            if(allParamTypes != ""){
              name = "class with constructor with parameters of type " + allParamTypes;
              // Check if this attribute has been seen globally
              if(!attributeList.has(name)){

                attributeList.set(name, id_start.id);
                id_start.id += 1;

                name = "";

              }
            }
            else{
              // If the constructor has parameters and all of them were stored
              if(allParamsStored == true){
                name = "class with constructor that stores all parameters as member variables";
                // Check if this attribute has been seen globally
                if(!attributeList.has(name)){

                  attributeList.set(name, id_start.id);
                  id_start.id += 1;

                  name = "";
                }
              }
            }
          }
        }
        // If the class doesn't define a constructor, then we add that as an
        // attribute
        else{
          name = "class does not define constructor";
          // Check if this attribute has been seen globally
          if(!attributeList.has(name)){

            attributeList.set(name, id_start.id);
            id_start.id += 1;

            name = "";
          }
        }

      // Come here once the constructor stuff has been taken care of
      // Output all member fields of a particular type
      // The way we output information about member variables here impacts the
      // interpretations of associated attributes. If there is a member field
      // that has an annotation, two attributes will be output. For example,
      // both class has member field called projectId AND
      // class has member field called projectId with annotation @Index
      // are output for a member field projectId that has annotation @Index.
      // However, if the member field does not have an annotation, only the
      // attribute class has member field called projectId will be output.
      // Later, when attributes are output for other related classes, if both
      // attributes are associated together, then it is the case that the class
      // has a member field with that name and annotation. On the other hand,
      // if only the member field without annotation version of the attribute
      // is frequently associated, then we know that that member field was
      // frequent but not the annotation itself.

      var declarations = subCL[j].findall('block/decl_stmt/decl');
      if (declarations != null){

        for(var x = 0; x < declarations.length; x++){

          var decl = declarations[x];
          var memberVarName = decl.find('name');

          if(memberVarName.text != null){

            name = "class has member field with name \"" + memberVarName.text + "\"";
            // Check if this attribute has been seen globally
            if(!attributeList.has(name)){

              attributeList.set(name, id_start.id);
              id_start.id += 1;

              name = "";
            }
          }

          // Generate feature for all member variable names with annotations
          var memberVarAnnotations = decl.findall('annotation');

          if(memberVarAnnotations != null){

            for(var q = 0; q < memberVarAnnotations.length; q++){

              var annot = memberVarAnnotations[q];
              var annotName = annot.find('name');
              var memberVarAnnotAttr = "class has member field with name \""
                                       + memberVarName.text
                                       + "\" and with annotation \" @"
                                       + annotName.text + "\"";
              var annotArgs = annot.findall('.//argument/expr');

              if(annotArgs.length > 0){
                memberVarAnnotAttr += " with \n";
                for(var z = 0; z < annotArgs.length; z++){

                  var node = annotArgs[z];

                  for(var u = 0; u < (node._children).length; u++){

                    var ch = (node._children)[u];

                    if(ch.text != null){
                      memberVarAnnotAttr += ch.text;
                    }
                    else{
                      for(var v = 0; v < (ch._children).length; v++){
                        var c = (ch._children)[v];
                        if(c.text != null){
                          memberVarAnnotAttr += c.text;
                        }
                      }
                    }

                  }
                  memberVarAnnotAttr += "\n";
                }
                // Remove trailing newline
                memberVarAnnotAttr = memberVarAnnotAttr.slice(0, -1);
              }

              // Check if this attribute has been seen globally
              if(!attributeList.has(memberVarAnnotAttr )){

                attributeList.set(memberVarAnnotAttr , id_start.id);
                id_start.id += 1;

                name = "";
              }
            }
          }

          // Generate feature for all member variable types
          var memberVarType = decl.find('type/name');

          // Check for nesting
          if(memberVarType != null){
            if(memberVarType.text == null){
              memberVarType = memberVarType.find('name');
            }
            memberVarTypeAttr = "class has member field of type \""
                                + memberVarType.text + "\"";

            // Check whether this attribute has been seen globally
            if(!attributeList.has(memberVarTypeAttr) && memberVarType.text != ""){

              attributeList.set(memberVarTypeAttr, id_start.id);
              id_start.id += 1;

              name = "";
            }

            // Generate feature for all member variable names with types
            if(memberVarName.text != null && memberVarType.text != null){

              if(memberVarType.text == ""){
                memberVarType = memberVarType.find('name');
              }
               var memberVarNameAndType = "class has member field of name \""
                                           + memberVarName.text
                                           + "\" of type \""
                                           + memberVarType.text + "\"";
                // Check whether attribute has been seen globally
                if(!attributeList.has(memberVarNameAndType)){
                  attributeList.set(memberVarNameAndType, id_start.id);
                  id_start.id += 1;

               }
            }
          }
          }
        }

        // Outside of declaration stuff
        // What a class implements
        var classImplements = subCL[j].find('super/implements');
        if (classImplements != null){
          name = "class with implementation of \""
                 + (classImplements.find('name')).text + "\"";
           // Check whether attribute has been seen globally
           if(!attributeList.has(name)){
             attributeList.set(name, id_start.id);
             id_start.id += 1;

             name = "";
          }
        }

        // Class visibility specifier
        var clsSpecificity = subCL[j].find('specifier');
        // If the class does not have an explicit visitbilit specifier
        // then it is public by default
        if(clsSpecificity == null){
          clsSpecificity = "public";
        }
        else{
          clsSpecificity = clsSpecificity.text;
        }

        var classSpecName = "is " + clsSpecificity + " class";
        // Check wether attribute has been seen globally
        if(!attributeList.has(classSpecName)){
          attributeList.set(classSpecName, id_start.id);
          id_start.id += 1;

       }

        // Stuff with functions
        // NOTE: This database is generated by first finding all classes (subclasses,
        // inner classes, outer classes), then finding all top-level functions in each
        // class. We do so to avoid generating duplicate functions/transactions, but
        // one consideration to note is that we may want to know that a function is in
        // a class that is a subclass of X, or that it is in a class that extends Y, etc.

        var funcList = subCL[j].findall('block/function');

        for(var x = 0; x < funcList.length; x++){

          var fnc = funcList[x];

          // Get the function name
          var fncName = fnc.find('name');

          // Get visibility specifiers for the functions
          // This will capture visibility specifiers, static, and abstract
          // functions
          var fncSpec = fnc.findall('specifier');
          var fncSpecType = " ";

          // If the function didn't have a visibility specifier then we
          // default to the class' visibility
          if(fncSpec.length == 0){
            fncSpecType = clsSpecificity;
          }
          else if(fncSpec.length > 0){
            // If the function had some kind of specifier (public, private
            // or protected, abstract, or static) then we need to check at
            // at least one is a visibility specifier; visibility specifiers
            // will be listed/found first
            if(fncSpec[0].text != "public" &&
               fncSpec[0].text != "private" &&
               fncSpec[0].text != "protected"){
                 fncSpecType = clsSpecificity;
               }
            // If the visibielity specifier is listed for this function, that is
            // what we use
            else{
              fncSpecType = fncSpec[0].text;
            }
            // Check for other keywords such as abstract or static
            for(var n = 0; n < fncSpec.length; n++){
              var spec = fncSpec[n];
              // If statement here to avoid adding the visbility specifier
              // twice
              if (spec.text != fncSpecType){
                fncSpecType = fncSpecType + " " + spec.text;
              }
            }
          }

          name = "class with function of visibility \""
                 + fncSpecType
                 + "\"  and name \""
                 + fncName.text + "\"";
          fncSpecType = "";

          // Check whether attribute has been seen globally
          if(!attributeList.has(name)){
            attributeList.set(name, id_start.id);
            id_start.id += 1;

            name = "";
         }

         var allExpr = fnc.findall('.//expr');
         for(var g = 0; g < allExpr.length; g++){

           var expr = allExpr[g];
           var op = expr.find('operator');
           var call = expr.find('call/name');

           if( op!=null && op.text == "new" && call!=null && call.text!=null){

             if(call.text == ""){
               call = call.find('name');
             }

             name = "function of name \""
                     + fncName.text
                     + "\" must call constructor of name \""
                     + call.text + "\"";

             // Check whether attribute has been seen globally
             if(!attributeList.has(name)){
               attributeList.set(name, id_start.id);
               id_start.id += 1;

               name = "";
             }
           }
         }

         // Combine searches for (1) constructor call and (2) function call in
         // return statement (combined for efficiency)
         var fncReturnInfo = fnc.find('.//block/return/expr');
         // Function return info exists: search for constructor or call
         if(fncReturnInfo != null){

           // (1) Calls constructor (expandable)
           var constructorCall = fncReturnInfo.find('operator');
           if (constructorCall != null && constructorCall.text == "new"){

             name = "function of name \""
                     + fncName.text
                     + "\" must call constructor in return statement";

             // Check whether attribute has been seen globally
             if(!attributeList.has(name)){
               attributeList.set(name, id_start.id);
               id_start.id += 1;

               name = "";
             }
           }

           // (2) Returns output from function call (expandable)
           var retOutputFromFncCall = fncReturnInfo.find('call');
           if (retOutputFromFncCall != null){
             name = "function of name \"" + fncName.text
                     + "\" must return output from function";

             // Check whether attribute has been seen globally
             if(!attributeList.has(name)){
               attributeList.set(name, id_start.id);
               id_start.id += 1;

               name = "";
             }

             var callName = retOutputFromFncCall.find('name');
             if (callName != null && callName.text != null){

               if(callName.text == ""){
                 callName = callName.find('name');
               }

               name = "function of name \"" + fncName.text
                      + "must return output from function of name \""
                      + callName.text + "\"";

              // Check whether attribute has been seen globally
              if(!attributeList.has(name)){
                attributeList.set(name, id_start.id);
                id_start.id += 1;

                name = "";
              }
             }
           }
         }
         // Has parameters (expandable)
         var fncParams = fnc.findall('parameter_list/parameter');
         var fncTypes = [];

         if (fncParams == null){
           name = "function of name \"" + fncName.text + "\" has no parameters";
           // Check whether attribute has been seen globally
           if(!attributeList.has(name)){
             attributeList.set(name, id_start.id);
             id_start.id += 1;

             name = "";
           }
         }
         else{

           var allFncParamTypes = "";
           for (var m = 0; m < fncParams.length; m++){

             var p = fncParams[m];
             var paramType = p.find('decl/type/name');

             // Check for nesting
             if (paramType.text == null){
               paramType = paramType.find('name');
             }

             if (!fncTypes.includes(paramType.text)){
               fncTypes.push(paramType.text);
             }
           }

           fncTypes.sort();
           for (var m = 0; m < fncTypes.length; m++){

             var allFncParamTypes = allFncParamTypes
                                    + "parameter of type \""
                                    + fncTypes[m] + "\"";

              if (m != fncTypes.length - 1){
                allFncParamTypes += " and ";
              }
           }

           if (allFncParamTypes != ""){

             name = "function of name \""
                    + fncName.text
                    + "has " + allFncParamTypes;

              // Check whether attribute has been seen globally
              if(!attributeList.has(name)){
                attributeList.set(name, id_start.id);
                id_start.id += 1;

                name = "";
              }
           }

         }

         fncTypes.length = 0;
         fncTypes = [];

         // Modifies member variable with specific name
         var modifiesMemberVar = fnc.findall('block/expr_stmt/expr');
         if (modifiesMemberVar != null){
           for (var n = 0; n < modifiesMemberVar.length; n++){

             var mod = modifiesMemberVar[n];
             var name = mod.find('name/name');
             var op = mod.find('operator');
             var call = mod.find('call/name/name');

             //console.log(call);
             if (name != null && name.text == "this" && op != null && op.text == "="
                 && call != null){


               var attrName = "function of name \""
                               + fncName.text
                               + "\" modifies member variable of name \""
                               + call.text + "\"";

               // Check whether attribute has been seen globally
               if(!attributeList.has(attrName)){
                 attributeList.set(attrName, id_start.id);
                 id_start.id += 1;

               }
             }
           }
         }

         // Combines searches for (1) is void and (2) returns type
         var returnType = fnc.find('type/name');
         if(returnType != null){
           // Check for list: when the return type is a list, the function's
           // type nests the list name with other arguments.
           if (returnType.text == ""){
             returnType = returnType.find('name');
           }
           // (1) Is void
           if (returnType.text == "void"){
             name =  "class with function of name \""
                      + fncName.text
                      + "\" of type \"void\"";
              // Check whether attribute has been seen globally
              if(!attributeList.has(name)){
                attributeList.set(name, id_start.id);
                id_start.id += 1;

                name = "";
              }
           }
           // (2) Returns type...
           else{

             name = "class with function of name \""
                     + fncName.text
                     + "\" returns type \""
                     + returnType.text + "\"";

             // Check whether attribute has been seen globally
             if(!attributeList.has(name)){
               attributeList.set(name, id_start.id);
               id_start.id += 1;

               name = "";
             }
           }
         }

         // Has annotation
         var fncAnnotCandidate = fnc.findall('annotation');
         if (fncAnnotCandidate != null){

           for (var g = 0; g < fncAnnotCandidate.length; g++){

             var fncAnnot = fncAnnotCandidate[g];
             name = "function of name \"" + fncName.text
                     + "\" has annotation \"@"
                     + (fncAnnot.find('name')).text
                     + "\"";
              var annotArgs = fncAnnot.findall('argument/expr');

              if(annotArgs.length > 0){
                name += " with \n";
                for(var z = 0; z < annotArgs.length; z++){

                  var node = annotArgs[z];

                  for(var u = 0; u < (node._children).length; u++){

                    var ch = (node._children)[u];

                    if(ch.text != null){
                      name += ch.text;
                    }
                    else{
                      for(var v = 0; v < (ch._children).length; v++){
                        var c = (ch._children)[v];
                        if(c.text != null){
                          name += c.text;
                        }
                      }
                    }

                  }

                  name += "\n";
                }
                // Remove trailing newline
                name = name.slice(0, -1);
              }

              // Check if this attribute has been seen globally
              if(!attributeList.has(name)){
                attributeList.set(name, id_start.id);
                id_start.id += 1;

                name = "";
              }
           }
         }
        }
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


        // Now we look for other attributes in the class
        //if(childName == "CrowdServlet" ) {console.log(childName);}
        // First we will output all the annotations on a class
        var clsAnnotCandidate = subCL[j].findall('annotation');
        if (clsAnnotCandidate.length > 0){

          for(var k = 0 ; k < clsAnnotCandidate.length; k++){

            clsAnnot = clsAnnotCandidate[k];
            //console.log(clsAnnot);
            var annotArgs = clsAnnot.findall('.//argument/expr');
            //console.log(annotArgs);
            var clsAnnotName = "class with annotation of \"@"
                                + (clsAnnot.find('name').text)
                                + "\"";

            if(annotArgs.length > 0){
              clsAnnotName += " with \n";
              for(var q = 0; q < annotArgs.length; q++){

                var node = annotArgs[q];

                for(var u = 0; u < (node._children).length; u++){

                  var ch = (node._children)[u];

                  if(ch.text != null){
                    clsAnnotName += ch.text;
                  }
                  else{
                    for(var v = 0; v < (ch._children).length; v++){
                      var c = (ch._children)[v];
                      if(c.text != null){
                        clsAnnotName += c.text;
                      }
                    }
                  }

                }
                clsAnnotName += "\n";
              }
              // Remove trailing newline
              clsAnnotName = clsAnnotName.slice(0, -1);
            }

            if(!allAttributes.has(clsAnnotName)){

              attributes.push(allAttributes.get(clsAnnotName));

            }
          }
        }

        // What kind of constructor the class has
        // Choose last constructor because sometimes a default is defined and
        // then re-defined by another constructor (see Microtask.java)
        var constructor = subCL[j].findall('block/constructor');

        if(constructor.length > 0){
          for(var q = 0; q < constructor.length; q++){

            var constr = constructor[q];
            var constructorBody = constr.find('block');

            var memVarSet = [];
            var setTo = [];

            var constrBodyList = constructorBody.find(".*");
            if(constrBodyList != undefined){

              var name = "class with non-empty constructor";

              if(!allAttributes.has(name)){

                attributes.push(allAttributes.get(name));

              }

              name = "";

              // Constructor sets member variables
              var constructorExpr = constructorBody.findall('expr_stmt/expr');

              // If member variables are set...
              for(var v = 0; v < constructorExpr.length; v++){

                var expr = constructorExpr[v];
                name = expr.find('name/name');
                var op = expr.find('operator');

                // If there exists some expr of the form this.field = _____
                if( ((name != null) && (name.text == "this")) && ((op != null) && (op.text == "="))){

                  // Store the names of the member variables that are set
                  var memVar = ((expr._children[0])._children[2]).text;
                  memVarSet.push(memVar);

                  // Store names of things that member variables are set to
                  var setToName = expr._children[2];

                  // Double check that it's not set to a literal
                  if (setToName == null){
                    setToName = expr.find('literal');
                  }
                  if (setToName == null){
                    setTo.push("something other than null or variable name");
                  }
                  else{
                    setTo.push(setToName.text);
                  }

                }
              }
              // Output something like "constructor sets member variables x,y,z"
              if(memVarSet.length > 0){
                memVarSet.sort();
                for(var x = 0; x < memVarSet.length; x++){
                  memVarSet[x] = " member variable with name \"" + memVarSet[x] + "\"";
                }
                name = "constructor must set " + memVarSet.join(" and ");

                // Check if attribute has been seen globally
                if(!allAttributes.has(name)){
                  attributes.push(allAttributes.get(name));
                }

                name = "";

              }

              // Check for calls to constructor
              var allExpr = constructorBody.findall('.//expr');
              for (var u = 0; u < allExpr.length; u++){

                var exp = allExpr[u];
                var op = exp.find('operator');
                var call = exp.find('call/name');

                if ((op != null) && (op.text == "new") && (call != null) && (call.text != null)){
                  name = "constructor must call constructor of class \"" + call.text + "\" ";

                  if(!allAttributes.has(name)){
                    attributes.push(allAttributes.get(name));
                  }

                  name = "";

                }
              }
            }
            // If the constructor didn't have a body, then we create an
            // attribute saying so
            else{
              name = "class has empty-body constructor";

              // Check if this attribute has been seen globally
              if(!allAttributes.has(name)){
                attributes.push(allAttributes.get(name));
              }
              name = "";
            }

            // Assume all parameters passed to the constructor are stored
            // as member variables
            // Assume that all parameters are stored as member variables
            var allParamsStored = true;
            var allParamTypes = "";
            var constrParamTypes = [];

            var paramsList = constr.findall('parameter_list/parameter/decl');

            for(var u = 0; u < paramsList.length; u++){

              var p = paramsList[u];
              var paramName = p.find('name');

              if(paramName.text != null && !setTo.includes(paramName.text)){
                allParamsStored = false;
              }

              var paramType = p.find('type/name');
              if(paramType.text == null){
                paramType = paramType.find('name');
              }

              if(!constrParamTypes.includes(paramType)){
                constrParamTypes.push(paramType.text);
              }
            }

            constrParamTypes.sort();

            for(var u = 0; u < constrParamTypes.length; u++){

              var t = constrParamTypes[u];
              allParamTypes = "\"" + t + "\"";

              if (t != constrParamTypes[-1]){
                allParamTypes = " and ";
              }
            }

            if(allParamTypes != ""){
              name = "class with constructor with parameters of type " + allParamTypes;
              // Check if this attribute has been seen globally
              if(!allAttributes.has(name)){
                attributes.push(allAttributes.get(name));
              }
              name = "";
            }
            else{
              // If the constructor has parameters and all of them were stored
              if(allParamsStored == true){
                name = "class with constructor that stores all parameters as member variables";
                // Check if this attribute has been seen globally
                if(!allAttributes.has(name)){
                  attributes.push(allAttributes.get(name));
                }
                name = "";
              }
            }

          }

        }
        // If the class doesn't define a constructor, then we add that as an
        // attribute
        else{
          name = "class does not define constructor";
          // Check if this attribute has been seen globally
          if(!allAttributes.has(name)){
            attributes.push(allAttributes.get(name));
          }
          name = "";
        }

      // Come here once the constructor stuff has been taken care of
      // Output all member fields of a particular type
      // The way we output information about member variables here impacts the
      // interpretations of associated attributes. If there is a member field
      // that has an annotation, two attributes will be output. For example,
      // both class has member field called projectId AND
      // class has member field called projectId with annotation @Index
      // are output for a member field projectId that has annotation @Index.
      // However, if the member field does not have an annotation, only the
      // attribute class has member field called projectId will be output.
      // Later, when attributes are output for other related classes, if both
      // attributes are associated together, then it is the case that the class
      // has a member field with that name and annotation. On the other hand,
      // if only the member field without annotation version of the attribute
      // is frequently associated, then we know that that member field was
      // frequent but not the annotation itself.

      var declarations = subCL[j].findall('block/decl_stmt/decl');
      if (declarations != null){

        for(var x = 0; x < declarations.length; x++){

          var decl = declarations[x];
          var memberVarName = decl.find('name');

          if(memberVarName.text != null){

            name = "class has member field with name \"" + memberVarName.text + "\"";
            // Check if this attribute has been seen globally
            if(!allAttributes.has(name)){
              attributes.push(allAttributes.get(name));
            }
            name = "";
          }


          // Generate feature for all member variable names with annotations
          var memberVarAnnotations = decl.findall('annotation');

          if(memberVarAnnotations != null){

            for(var q = 0; q < memberVarAnnotations.length; q++){

              var annot = memberVarAnnotations[q];
              var annotName = annot.find('name');
              var memberVarAnnotAttr = "class has member field with name \""
                                       + memberVarName.text
                                       + "\" and with annotation \" @"
                                       + annotName.text + "\"";
              var annotArgs = annot.findall('.//argument/expr');

              if(annotArgs.length > 0){
                memberVarAnnotAttr += " with \n";
                for(var z = 0; z < annotArgs.length; z++){

                  var node = annotArgs[z];

                  for(var u = 0; u < (node._children).length; u++){

                    var ch = (node._children)[u];

                    if(ch.text != null){
                      memberVarAnnotAttr += ch.text;
                    }
                    else{
                      for(var v = 0; v < (ch._children).length; v++){
                        var c = (ch._children)[v];
                        if(c.text != null){
                          memberVarAnnotAttr += c.text;
                        }
                      }
                    }

                  }
                  memberVarAnnotAttr += "\n";
                }
                // Remove trailing newline
                memberVarAnnotAttr = memberVarAnnotAttr.slice(0, -1);
              }

              // Check if this attribute has been seen globally
              if(!allAttributes.has(memberVarAnnotAttr )){
                attributes.push(allAttributes.get(memberVarAnnotAttr));
              }
            }
          }

            // Generate feature for all member variable types
            var memberVarType = decl.find('type/name');

            // Check for nesting
            if(memberVarType != null){
              if(memberVarType.text == null){
                memberVarType = memberVarType.find('name');
              }
              memberVarTypeAttr = "class has member field of type \""
                                  + memberVarType.text + "\"";

              // Check whether this attribute has been seen globally
              // Check if this attribute has been seen globally
              if(allAttributes.has(memberVarTypeAttr)){
                attributes.push(allAttributes.get(memberVarTypeAttr));
              }

              // Generate feature for all member variable names with types
              if(memberVarName.text != null && memberVarType.text != null){

                if(memberVarType.text == ""){
                  memberVarType = memberVarType.find('name');
                }
                 var memberVarNameAndType = "class has member field of name \""
                                             + memberVarName.text
                                             + "\" of type \""
                                             + memberVarType.text + "\"";
                  // Check whether attribute has been seen globally
                  if(allAttributes.has(memberVarNameAndType)){
                    attributes.push(allAttributes.get(memberVarNameAndType));
                  }
              }
            }
          }
        }

        // Outside of declaration stuff
        // What a class implements
        var classImplements = subCL[j].find('super/implements');
        if (classImplements != null){
          name = "class with implementation of \""
                 + (classImplements.find('name')).text + "\"";

           if(allAttributes.has(name)){
             attributes.push(allAttributes.get(name));
           }
           name = "";
        }

        // Class visibility specifier
        var clsSpecificity = subCL[j].find('specifier');
        // If the class does not have an explicit visitbilit specifier
        // then it is public by default
        if(clsSpecificity == null){
          clsSpecificity = "public";
        }
        else{
          clsSpecificity = clsSpecificity.text;
        }

        var classSpecName = "is " + clsSpecificity + " class";
        // Check wether attribute has been seen globally
        if(allAttributes.has(classSpecName)){
          attributes.push(allAttributes.get(classSpecName));
        }

        // Stuff with functions
        // NOTE: This database is generated by first finding all classes (subclasses,
        // inner classes, outer classes), then finding all top-level functions in each
        // class. We do so to avoid generating duplicate functions/transactions, but
        // one consideration to note is that we may want to know that a function is in
        // a class that is a subclass of X, or that it is in a class that extends Y, etc.

        var funcList = subCL[j].findall('block/function');

        for(var x = 0; x < funcList.length; x++){

          var fnc = funcList[x];

          // Get the function name
          var fncName = fnc.find('name');

          // Get visibility specifiers for the functions
          // This will capture visibility specifiers, static, and abstract
          // functions
          var fncSpec = fnc.findall('specifier');
          var fncSpecType = " ";

          // If the function didn't have a visibility specifier then we
          // default to the class' visibility
          if(fncSpec.length == 0){
            fncSpecType = clsSpecificity;
          }
          else if(fncSpec.length > 0){
            // If the function had some kind of specifier (public, private
            // or protected, abstract, or static) then we need to check at
            // at least one is a visibility specifier; visibility specifiers
            // will be listed/found first
            if(fncSpec[0].text != "public" &&
               fncSpec[0].text != "private" &&
               fncSpec[0].text != "protected"){
                 fncSpecType = clsSpecificity;
               }
            // If the visibielity specifier is listed for this function, that is
            // what we use
            else{
              fncSpecType = fncSpec[0].text;
            }
            // Check for other keywords such as abstract or static
            for(var n = 0; n < fncSpec.length; n++){
              var spec = fncSpec[n];
              // If statement here to avoid adding the visbility specifier
              // twice
              if (spec.text != fncSpecType){
                fncSpecType = fncSpecType + " " + spec.text;
              }
            }
          }

          name = "class with function of visibility \""
                 + fncSpecType
                 + "\"  and name \""
                 + fncName.text + "\"";
          fncSpecType = "";

          if(allAttributes.has(name)){
            attributes.push(allAttributes.get(name));
          }
          name = "";

         var allExpr = fnc.findall('.//expr');

         for(var g = 0; g < allExpr.length; g++){

           var expr = allExpr[g];
           var op = expr.find('operator');
           var call = expr.find('call/name');

           if( op!=null && op.text == "new" && call!=null && call.text!=null){

             if(call.text == ""){
               call = call.find('name');
             }

             name = "function of name \""
                     + fncName.text
                     + "\" must call constructor of name \""
                     + call.text + "\"";

             if(allAttributes.has(name)){
               attributes.push(allAttributes.get(name));
             }
             name = "";
            }
          }

         // Combine searches for (1) constructor call and (2) function call in
         // return statement (combined for efficiency)
         var fncReturnInfo = fnc.find('.//block/return/expr');
         // Function return info exists: search for constructor or call
         if(fncReturnInfo != null){

           // (1) Calls constructor (expandable)
           var constructorCall = fncReturnInfo.find('operator');
           if (constructorCall != null && constructorCall.text == "new"){

             name = "function of name \""
                     + fncName.text
                     + "\" must call constructor in return statement";

             if(allAttributes.has(name)){
               attributes.push(allAttributes.get(name));
             }
             name = "";
           }


           // (2) Returns output from function call (expandable)
           var retOutputFromFncCall = fncReturnInfo.find('call');
           if (retOutputFromFncCall != null){
             name = "function of name \"" + fncName.text
                     + "\" must return output from function";

             if(allAttributes.has(name)){
               attributes.push(allAttributes.get(name));
             }
             name = "";

             var callName = retOutputFromFncCall.find('name');
             if (callName != null && callName.text != null){

               if(callName.text == ""){
                 callName = callName.find('name');
               }

               name = "function of name \"" + fncName.text
                      + "must return output from function of name \""
                      + callName.text + "\"";

               if(allAttributes.has(name)){
                 attributes.push(allAttributes.get(name));
               }
                name = "";
            }
           }
         }

         // Has parameters (expandable)
         var fncParams = fnc.findall('parameter_list/parameter');
         var fncTypes = [];

         if (fncParams == null){
           name = "function of name \"" + fncName.text + "\" has no parameters";
           if(allAttributes.has(name)){
             attributes.push(allAttributes.get(name));
           }
            name = "";
         }
         else{

           var allFncParamTypes = "";
           for (var m = 0; m < fncParams.length; m++){

             var p = fncParams[m];
             var paramType = p.find('decl/type/name');

             // Check for nesting
             if (paramType.text == null){
               paramType = paramType.find('name');
             }

             if (!fncTypes.includes(paramType.text)){
               fncTypes.push(paramType.text);
             }
           }

           fncTypes.sort();
           for (var m = 0; m < fncTypes.length; m++){

             var allFncParamTypes = allFncParamTypes
                                    + "parameter of type \""
                                    + fncTypes[m] + "\"";

              if (m != fncTypes.length - 1){
                allFncParamTypes += " and ";
              }
           }

           if (allFncParamTypes != ""){

             name = "function of name \""
                    + fncName.text
                    + "has " + allFncParamTypes;

            if(allAttributes.has(name)){
              attributes.push(allAttributes.get(name));
            }
             name = "";
           }

         }

         fncTypes.length = 0;
         fncTypes = [];

         // Modifies member variable with specific name
         var modifiesMemberVar = fnc.findall('block/expr_stmt/expr');
         if (modifiesMemberVar != null){
           for (var n = 0; n < modifiesMemberVar.length; n++){

             var mod = modifiesMemberVar[n];
             var name = mod.find('name/name');
             var op = mod.find('operator');
             var call = mod.find('call/name/name');

             //console.log(call);
             if (name != null && name.text == "this" && op != null && op.text == "="
                 && call != null){


               var attrName = "function of name \""
                               + fncName.text
                               + "\" modifies member variable of name \""
                               + call.text + "\"";

               if(allAttributes.has(attrName)){
                 attributes.push(allAttributes.get(attrName));
               }
             }
           }
         }

         // Combines searches for (1) is void and (2) returns type
         var returnType = fnc.find('type/name');
         if(returnType != null){
           // Check for list: when the return type is a list, the function's
           // type nests the list name with other arguments.
           if (returnType.text == ""){
             returnType = returnType.find('name');
           }
           // (1) Is void
           if (returnType.text == "void"){
             name =  "class with function of name \""
                      + fncName.text
                      + "\" of type \"void\"";
             if(allAttributes.has(name)){
               attributes.push(allAttributes.get(name));
             }
             name = "";
           }
           // (2) Returns type...
           else{

             name = "class with function of name \""
                     + fncName.text
                     + "\" returns type \""
                     + returnType.text + "\"";

             if(allAttributes.has(name)){
               attributes.push(allAttributes.get(name));
             }
             name = "";
           }
         }

         // Has annotation
         var fncAnnotCandidate = fnc.findall('annotation');
         if (fncAnnotCandidate != null){

           for (var h = 0; h < fncAnnotCandidate.length; h++){

             var fncAnnot = fncAnnotCandidate[h];
             name = "function of name \"" + fncName.text
                     + "\" has annotation \"@"
                     + (fncAnnot.find('name')).text
                     + "\"";
              var annotArgs = fncAnnot.findall('argument/expr');

              if(annotArgs.length > 0){
                name += " with \n";
                for(var z = 0; z < annotArgs.length; z++){

                  var node = annotArgs[z];

                  for(var u = 0; u < (node._children).length; u++){

                    var ch = (node._children)[u];

                    if(ch.text != null){
                      name += ch.text;
                    }
                    else{
                      for(var v = 0; v < (ch._children).length; v++){
                        var c = (ch._children)[v];
                        if(c.text != null){
                          name += c.text;
                        }
                      }
                    }

                  }
                  name += "\n";
                }
                // Remove trailing newline
                name = name.slice(0, -1);
              }

              if(allAttributes.has(name)){
                attributes.push(allAttributes.get(name));
              }
               name = "";
           }
         }
        }
      }
    }

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
    } // End of outermost for loop

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
