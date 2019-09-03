import xml.etree.ElementTree as ET
import SCI_class_and_functions as SCI
nameSpace = { 'src': 'http://www.srcML.org/srcML/src'}

# Import data for reading
# This is the name of a srcML document that only has
classFilename = "crowdCode.xml"
classTree = ET.parse(classFilename)
classRoot = classTree.getroot()

peripheralClassFile = "crowdCode.xml"
peripheralClassTree = ET.parse(peripheralClassFile)
peripheralClassRoot = peripheralClassTree.getroot()

outputFile = "attributeMETAdata_crowdCode.txt"

# For this version it should be some sort of "start" to a name since we want
# to output a different database for each set of children classes
analysisFileName = "AE_crowdCode"

id_start = 1

nameSpace = { 'src': 'http://www.srcML.org/srcML/src'}
allAttributes = {}

# The basic idea of the algorithm is to extract all the attributes from a
# single base class, and then look for those attributes in a set of classes
# that are related to the base class in some way. Only attributes found in
# both the base class and the related (peripheral) classes are output to
# the database that is fed to the FP Growth algorithm.

outputPairs = SCI.makePairsList(classRoot)

childParent = outputPairs[0]
interfacePairs = outputPairs[1]

#print(childParent)
#print(interfacePairs)

DEPTH = 2

# Generate class groupings based off of inheritance and interfaces
for supa in childParent:
    SCI.addChildren(supa, childParent, supa, DEPTH)
    (SCI.groupList)[supa].append(supa)

#print (SCI.groupList)

# Generate attributes
for group in SCI.groupList:

    output = SCI.addParentChildRelations(classTree, id_start, SCI.groupList[group])
    id_start = output[0]
    allAttributes.update(output[1])
    #print(output[1])
    #print("***")
    #print(allAttributes)

print("-----------")

SCI.outputMetaData(allAttributes, outputFile)

for group in SCI.groupList:

    # grouping is a list of the parent class and its children and grandchildren
    grouping = SCI.groupList[group]

    SCI.findParentChildRelations(peripheralClassRoot, allAttributes, grouping, analysisFileName)
