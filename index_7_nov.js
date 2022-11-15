//Load express module with `require` directive
const express = require('express');
const fileUpload = require('express-fileupload');
const { Web3Storage, getFilesFromPath  } = require('web3.storage');
const fetch = require('node-fetch')
const { writeFile } = require("fs/promises");
const app = express();
var fs = require('fs');
const util = require('util')
app.use(
  fileUpload({
    extended: true,
  })
);
app.use(express.json());
const path = require("path");

const st = 'T00:00:00Z';
const et = 'T23:59:59Z';

const starttime = new Date(st);
const endtime = new Date(et);
const {InfluxDB, consoleLogger} = require('@influxdata/influxdb-client')
const {BucketsAPI} = require('@influxdata/influxdb-client-apis')
const ethers = require('ethers')
//Define port
var port = 3002
const org = 'LTE'
//Define request response in root URL (/)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/fincom.html", (req, res) => {
  res.sendFile(path.join(__dirname, "fincom.html"));
});

app.get("/generateaddresses.html", (req, res) => {
  res.sendFile(path.join(__dirname, "generateaddresses.html"));
});

app.get("/updateaddresses.html", (req, res) => {
  res.sendFile(path.join(__dirname, "updateaddresses.html"));
});

app.post("/uploadData", async (req, res) => {
var date = req.body.datefolder;
console.log(date)
// Setup date format for influxDB query
let starttime = date.concat(st);
let endtime = date.concat(et);
const influxToken = '0YMSnHfOJdeoKjnQ8CzGVmj_bpP4nFawLGbK8wEqZIfh2Woje5XQHY4qZj9027Jj3efbvH81MHFW78Esz_ImiQ=='
const org = 'LTE'
const client = new InfluxDB({url: "http://192.168.0.100:8086", token: influxToken})


//Connect to Mongo Database
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var uri = "mongodb://LTE:ET_2021!@192.168.0.100/";
const clientMongo = new MongoClient(uri);
await clientMongo.connect();
    // Get the database
const db = clientMongo.db("simulator");
async function getTopology () {
  return new Promise(function(resolve, reject) {
     db.collection("addresses").find({"_id": new ObjectID("63234545b21dc241195119e2")}).toArray( function(err, docs) {
      if (err) {
        // Reject the Promise with an error
        return reject(err)
      }

      // Resolve (or fulfill) the promise with data
      return resolve(docs)
    })
  })
}

async function getMongoData(result) {
  //console.log(result)
  //Get all keys (sector names e.g. N671) in an array
  var keys = [];
  for (var k in result[0].IEEE13) keys.push(k);
  // Phase array, get the phases for each sector (N671)
  var p = []
  var phase = []
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < result[0].IEEE13[keys[i]].length; j++) {
      p.push(Object.keys(result[0].IEEE13[keys[i]][j]).toString())
    }
    phase.push(p);
    p = []
  }
  // Get houses in each phase
  var houses = []
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < phase[i].length; j++) {
      //console.log(result[0].IEEE13[keys[i]][j][phase[i][j]][0])
      houses.push(result[0].IEEE13[keys[i]][j][phase[i][j]]);
    }
  }
  var housesnew = [].concat.apply([], houses);

  //console.log(houses);
  // Structuring data for simple loop to store data
  let m = 0
  let arrrr = []
  for (var k = 0; k < keys.length; k++) {
    for (var l = 0; l < phase[k].length; l++) {
      
      arrrr.push([keys[k], phase[k][l], houses[m]])
      m=m+1
      
    }
  }
  var IPFStime = []
  var SCtime = []
  const average = array => array.reduce((a, b) => a + b) / array.length;
  // Making queries for each house and store data in blockchain
  for (var i = 0; i < arrrr.length; i++) {
    for (var j = 0; j < arrrr[i][2].length; j++){
      console.log('Data is being retrieved for ', 'node: ', arrrr[i][0], 'phase: ', arrrr[i][1], 'house: ', arrrr[i][2][j])
      
      const returnValues = await queryExample(`\
      from(bucket:"IEEE13")\
      |> range(start: ${starttime} , stop: ${endtime})\
      |> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Final")\
      |> filter(fn: (r) => r["_field"] == "TotalConsumption")\
      |> filter(fn: (r) => r["node"] == ${JSON.stringify(arrrr[i][0])})\
      |> filter(fn: (r) => r["phase"] == ${JSON.stringify(arrrr[i][1])})\
      |> filter(fn: (r) => r["user"] == ${JSON.stringify((j+1).toString())})\
      `, arrrr[i][2][j])

      IPFStime.push(returnValues[0])
      SCtime.push(returnValues[1])
      
    }
    
  }
   
  console.log("Average time to upload data to IPFS is: ", average(IPFStime)/1000, "seconds")
  console.log("Average time to upload data to blockchain is: ", average(SCtime)/1000, "seconds")
   //await queryExample(`\
   // from(bucket:"IEEE13")\
   // |> range(start: ${starttime} , stop: ${endtime})\
   // |> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Final")\
   // |> filter(fn: (r) => r["_field"] == "TotalConsumption")\
   // |> filter(fn: (r) => r["node"] == ${JSON.stringify(req.body.sector)})\
   // |> filter(fn: (r) => r["phase"] == ${JSON.stringify(req.body.phase)})\
   // |> filter(fn: (r) => r["user"] == ${JSON.stringify(req.body.house)})\
   //`, arrrr[0][2][0])

}

const topologyResult = await getTopology()

// Gets topology Info

await getMongoData(topologyResult);

res.send("Data uploaded to blockchain")

//console.log(topologyResult)


//console.log('*** Get buckets by name ***')
  //const bucketsAPI = new BucketsAPI(client)
  //const buckets = await bucketsAPI.getBuckets({orgID: 'aedcb81ffe14d892', limit: 100})

  //Get all buckets names
//for (var i = 0; i < 3; i++) {
    //console.log(buckets.buckets[i].name)
    //console.log(buckets.buckets.length)
//}



async function queryExample(fluxQuery, address) {
  var arr = [];
  console.log('\n*** QUERY ***')

  // Getting data from influxDB
  const queryApi = client.getQueryApi(org)

  
  try {
    
    var startTime = new Date();
    
      const data = await queryApi.collectRows(
      fluxQuery 
     )
     data.forEach((i) => arr.push(JSON.stringify(i._value)))

     var arrays = [], size = 144;
    
    for (let i = 0; i < arr.length; i += size) {
      arrays.push(arr.slice(i, i + size));
    }
    //Putting data in respective variables
    var Total_Consumption_Real = arrays[0].map(function(each_element){
      return Number(each_element).toFixed(2);
    });
  
    var Total_Consumption_Initial = arrays[1].map(function(each_element){
      return Number(each_element).toFixed(2);
    });

    var Total_Consumption_Final = arrays[2].map(function(each_element){
      return Number(each_element).toFixed(2);
    })
    ;
    //console.log(Total_Consumption_Real)
    //console.log(Total_Consumption_Initial)
    //console.log(Total_Consumption_Final)

    //Creating JSON template for decentralized storage
    var dict = {"initial" : Total_Consumption_Initial,
                "final" : Total_Consumption_Final,
                "real" : Total_Consumption_Real,
                "initialprice" : 20,
                "finalprice" : 30};
    var dictstring = JSON.stringify(dict);
    
    await writeFile('data.json', dictstring, (err) => {});
    //Putting data in decentralized storage
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGYwNTMwNUY1NUJiRjM4MjhjNjE2Q0RhYTk0ZDZGN2YzMDVjQTRjYzUiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NTIxMjY3NTM2MTIsIm5hbWUiOiJTdG9yYWdlU29sIn0.XH1EzxD93lUrJVVnO1uzpzDsmh4XG1PEsdgJdBpVvlk";
    const storage = new Web3Storage({ token: token });
    const files = await getFilesFromPath('data.json');
    const cid = await storage.put(files)
    console.log(`IPFS CID: ${cid}`)
    //Deleting file from server
    await fs.unlink('data.json', async function (err) {
      if (err) throw err;
      // if no error, file has been deleted successfully
    console.log('File deleted!');
    });

    var endTime = new Date() - startTime;
    


    var startTimeNew = new Date();

    //try {
    await storeDataInBlockchain(address, req.body.datefolder, cid)

    var endTimeNew = new Date() - startTimeNew;

    //console.log("Total time to store hash in blockchain is: " , endTimeNew/1000, "seconds")
    //} catch (e) {
     // console.error(e)
     // console.log('Transaction could not be processed')
    //}
    //sleep(10000).then(() => {
     // console.log("Please wait")
    //});
    //try {
    
    
    //await financialCalculation('0x65416FDd2C5e40074B25AA2B9C1176269ee8e4F6', req.body.datefolder)
    
    
    //} catch (e) {
    //  console.error(e)
    //  console.log('Financial Calculation could not be processed')
    //}
    return([endTime, endTimeNew])
  
  } catch (e) {
    console.error(e)
    console.log('\nCollect ROWS ERROR')
  }
  
  
}

async function storeDataInBlockchain(address, date, hash) {
  const { ethers } = require("hardhat");
  //Environment variables
  const API_URL = process.env.API_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS_1 = process.env.CONTRACT_ADDRESS_STO;
  // Contract ABI
  const { abi } = require("./artifacts/contracts/ConsumptionStorage.sol/ConsumptionStorage.json");
  const provider = new ethers.providers.JsonRpcProvider(API_URL);
  // It calculates the blockchain address from private key
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  //console.log(signer)
  const StorageContract = new ethers.Contract(CONTRACT_ADDRESS_1, abi, signer);
  let _hash = hash.toString();
  let _customer = address;
  let _date = date;

  //Checking if data is already available for certain date and address
  const newMessage = await StorageContract.GetPlannedData(_date, _customer);
  if (newMessage == "") {
    console.log("Updating the Energy Data...");
    const tx = await StorageContract.SetPlannedData(_hash, _customer, _date);
    await tx.wait();
  }
  else {
    console.log("Data is already stored for this date")
  }
  // Shows the stored hash
  const newMessage1 = await StorageContract.GetPlannedData(_date, _customer);
  console.log("The stored hash is: " + newMessage1);
}

//|> range(start: 2018-12-10T00:00:00Z, stop: 2018-12-10T23:59:59Z)\
//Defining Query
//|> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Final")

});


app.post("/financialcalculation", async (req, res) => {
  var date = req.body.datefolder;
  
  //Connect to Mongo Database
  var MongoClient = require('mongodb').MongoClient;
  var ObjectID = require('mongodb').ObjectID;
  var uri = "mongodb://LTE:ET_2021!@192.168.0.100/";
  const clientMongo = new MongoClient(uri);
  await clientMongo.connect();
      // Get the database
  const db = clientMongo.db("simulator");
  async function getTopology () {
    return new Promise(function(resolve, reject) {
       db.collection("addresses").find({"_id": new ObjectID("63234545b21dc241195119e2")}).toArray( function(err, docs) {
        if (err) {
          // Reject the Promise with an error
          return reject(err)
        }
  
        // Resolve (or fulfill) the promise with data
        return resolve(docs)
      })
    })
  }
  
  
 
  async function financialCalculation(result, dateupload) {
    //customerDID = '0x9e823dDAd833195d30944eDA6CE14F41396cae48'
    //console.log(result)
    //Get all keys (sector names e.g. N671) in an array
    var keys = [];
    for (var k in result[0].IEEE13) keys.push(k);
    // Phase array, get the phases for each sector (N671)
    var p = []
    var phase = []
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < result[0].IEEE13[keys[i]].length; j++) {
        p.push(Object.keys(result[0].IEEE13[keys[i]][j]).toString())
      }
      phase.push(p);
      p = []
    }
    // Get houses in each phase
    var houses = []
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < phase[i].length; j++) {
        //console.log(result[0].IEEE13[keys[i]][j][phase[i][j]][0])
        houses.push(result[0].IEEE13[keys[i]][j][phase[i][j]]);
      }
    }
    var housesnew = [].concat.apply([], houses);

    //console.log(housesnew)
    const { ethers } = require("hardhat");
    const API_URL = process.env.API_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS_1 = process.env.CONTRACT_ADDRESS_STO;
    const CONTRACT_ADDRESS_2 = process.env.CONTRACT_ADDRESS_FIN;
    
    //Fetching the data from blockchain using Storage Contract address and abi
    const contract1 = require("./artifacts/contracts/ConsumptionStorage.sol/ConsumptionStorage.json");  const provider = new ethers.providers.JsonRpcProvider(API_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const PlannedStorageContract = new ethers.Contract(CONTRACT_ADDRESS_1, contract1.abi, signer);
    var fintime = []


    for (var i=0; i < housesnew.length; i++) {
      var startTime = new Date();
      const newMessage = await PlannedStorageContract.GetPlannedData(dateupload, housesnew[i]);
      if (newMessage != "") {
        console.log("Retreiving the planned consumption data for: ", housesnew[i]);
        var newMessage1 = newMessage;
        console.log(newMessage)
      }
      else {
        console.log("Data is not available for this date or customer ID")
        newMessage1 = '';
      }
      //console.log(newMessage1);
      //Fetching the data from decentralized storage using hash
      let response1 = await fetch(`https://${newMessage1}.ipfs.w3s.link/data.json`)
      obj1 = await response1.json();
    
      //storing data in variables
      initial_consumption = obj1.initial
      final_consumption = obj1.final;
      real_consumption = obj1.real;
      let initialprice = obj1.initialprice;
      let finalprice = obj1.finalprice;
      
      //Converting data to integers
  
      //console.log(initial_consumption)
      //console.log(final_consumption)
      //console.log(real_consumption)
    
      var initscfloat = initial_consumption.map(x => x * 100);
      var finalscfloat = final_consumption.map(x => x * 100);
      var realscfloat = real_consumption.map(x => x * 100);
      
      var initsc = initscfloat.map(function(each_element){
        return Number(each_element).toFixed(0);
      });
  
      var finalsc = finalscfloat.map(function(each_element){
        return Number(each_element).toFixed(0);
      });
  
      var realsc = realscfloat.map(function(each_element){
        return Number(each_element).toFixed(0);
      });
  
      console.log("Initial Consumption: ", initsc)
      console.log("Initial Consumption: ", finalsc)
      //console.log(realsc)
      const contract2 = require("./artifacts/contracts/FinancialCom.sol/FinancialCom.json");
      const FinancialCom = new ethers.Contract(CONTRACT_ADDRESS_2, contract2.abi, signer);
      const newMessage3 = await FinancialCom.TotalPrice(dateupload, housesnew[i]);
      if (newMessage3 == 0) {
        console.log("Calculating the financial compensation");
        const tx = await FinancialCom.FinancialCalculation(initsc, finalsc, realsc, initialprice, finalprice, dateupload, housesnew[i]);
        await tx.wait();
      }
      else {
        console.log("The financial compensation is already calculated for this date and user");
      }
    
      const newMessage4 = await FinancialCom.TotalPrice(dateupload, housesnew[i]);
      console.log("The calculated financial compensation is: " + (newMessage4/100000));

      var endTime = new Date() - startTime;
      fintime.push(endTime)
      console.log(fintime)
    }
    
    return(fintime)
  
  }
 
  
  
 

  const topologyResult = await getTopology()
  
  const average = array => array.reduce((a, b) => a + b) / array.length;
  const finArr = await financialCalculation(topologyResult, req.body.datefolder);

  console.log("Average time to retrieve data and financial calculation is:", average(finArr)/1000, "seconds")

  res.send("Financial Calculations Completed")
  
  //|> range(start: 2018-12-10T00:00:00Z, stop: 2018-12-10T23:59:59Z)\
  //Defining Query
  //|> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Final")
  
  });


app.post("/generateaddresses", async (req, res) => {
//Connect to Mongo Database
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var uri = "mongodb://LTE:ET_2021!@192.168.0.100/";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    // Get the database
    const db = client.db("simulator");

     // Get Collection Names

    const collections = await db.listCollections().toArray()
    collectionNames = []
    collections.forEach((col) => {
      collectionNames.push(col.name);
    });
    //console.log(collectionNames);

    // Get the collection (topology of simulation with object ID)
    var cursor1 = db.collection("topology1").find({"_id": new ObjectID("63234545b21dc241195119e1")});
    
    
    async function getTopology () {
      return new Promise(function(resolve, reject) {
         db.collection("topology1").find({"_id": new ObjectID("63234545b21dc241195119e2")}).toArray( function(err, docs) {
          if (err) {
            // Reject the Promise with an error
            return reject(err)
          }
    
          // Resolve (or fulfill) the promise with data
          return resolve(docs)
        })
      })
    }

    async function generateAddresses(result) {
    
      //Get all keys (sector names e.g. N671) in an array
      var keys = [];
      for (var k in result[0].IEEE13) keys.push(k);
      // Phase array, get the phases for each sector (N671)
      var p = []
      var phase = []
      for (let i = 0; i < keys.length; i++) {
        for (let j = 0; j < result[0].IEEE13[keys[i]].length; j++) {
          p.push(Object.keys(result[0].IEEE13[keys[i]][j]).toString())
        }
        phase.push(p);
        p = []
      }
      // Get houses in each phase
      var houses = []
      for (let i = 0; i < keys.length; i++) {
        for (let j = 0; j < phase[i].length; j++) {
          houses.push(result[0].IEEE13[keys[i]][j][phase[i][j]]);
        }
      }
      //Sum all houses
      const initialValue = 0;
      const sumWithInitial = houses.reduce(
      (previousValue, currentValue) => previousValue + currentValue,
      initialValue
      );
  
      //Generate blockchain addresses for each house
      var addresses = [];
      var privatekeys = [];
  
      for (let i = 0; i < sumWithInitial; i++) {
        const wallet = ethers.Wallet.createRandom()
        addresses.push(wallet.address)
        privatekeys.push(wallet.privateKey)
      }
      // assign blockchain address to each home
      for (let i = 0; i < houses.length; i++) {
        var b = addresses.splice(0,houses[i]);
        p.push(b)
        
      }
      addresses = p;
      //console.log(addresses);
  
      let index = 0
      // Add addresses in topology
      for (let i = 0; i < keys.length; i++) {
        for (let j = 0; j < phase[i].length; j++) {
          result[0].IEEE13[keys[i]][j][phase[i][j]] = addresses[index];
          index = index+1; 
        }
      }
      for (let i = 0; i < keys.length; i++) {
        //console.log(result[0].IEEE13[keys[i]]) 
      }
      
      //console.log(result)
      
      if (collectionNames.includes('addresses'))
      {
        db.collection('addresses').drop(function(err, delOK) {
          if (err) throw err;
          if (delOK) console.log("Collection deleted");
        });
      }
  
      console.log("Creating Collections Addresses")
      db.collection('addresses').insert(result, function(error, record){
        if (error) throw error;
        console.log("Data Saved");
       });
  
       
      
    // Storing data in addresses collection
    
    }; 
    var startTime = new Date();
    const topologyResult = await getTopology()
    
    // It generated addresses based on topology defined in MongoDB topology
    await generateAddresses(topologyResult);
    
    var endTime = new Date() - startTime;

    console.log("Total time to generate addresses is: " , endTime/1000, "seconds")
  
  } finally {

  }
}
run().catch(console.dir);


res.send("Addresses generated")
});


// To update the address from topology



app.post("/updateaddresses", async (req, res) => {
  //Connect to Mongo Database
  //Connect to Mongo Database
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var uri = "mongodb://LTE:ET_2021!@192.168.0.100/";
const clientMongo = new MongoClient(uri);
await clientMongo.connect();
    // Get the database
const db = clientMongo.db("simulator");
const collections = await db.listCollections().toArray()
    collectionNames = []
    collections.forEach((col) => {
      collectionNames.push(col.name);
});

  async function getAddresses () {
    return new Promise(function(resolve, reject) {
      db.collection("addresses1").find({"_id": new ObjectID("63234545b21dc241195119e1")}).toArray( function(err, docs) {
        if (err) {
          // Reject the Promise with an error
          return reject(err)
        }

        // Resolve (or fulfill) the promise with data
        return resolve(docs)
      })
    })
  }

  async function getTopology () {
    return new Promise(function(resolve, reject) {
      db.collection("topology").find({"_id": new ObjectID("63234545b21dc241195119e1")}).toArray( function(err, docs) {
        if (err) {
          // Reject the Promise with an error
          return reject(err)
        }

        // Resolve (or fulfill) the promise with data
        return resolve(docs)
      })
    })
  }
  
  async function updateAddresses(oldtopology, newtopology) {
    
   

    //Get all keys (sector names e.g. N671) in an array
    var oldkeys = [];
    for (var k in oldtopology[0].IEEE13) oldkeys.push(k);

    var newkeys = [];
    for (var k in newtopology[0].IEEE13) newkeys.push(k);

    // Check for new sectors, i.e., N761 
    let unique1 = oldkeys.filter((o) => newkeys.indexOf(o) === -1);
    let unique2 = newkeys.filter((o) => oldkeys.indexOf(o) === -1);

    const unique = unique1.concat(unique2);

    //console.log(unique);

    //console.log(oldkeys)
    //console.log(newkeys)

    // Get phases and houses of new sectors
    
    var p = []
    var phase = []
    for (let i = 0; i < unique.length; i++) {
      for (let j = 0; j < newtopology[0].IEEE13[unique[i]].length; j++) {
        p.push(Object.keys(newtopology[0].IEEE13[unique[i]][j]).toString())
      }
      phase.push(p);
      p = []
    }
    // Get houses in each phase
    var houses = []
    for (let i = 0; i < unique.length; i++) {
      for (let j = 0; j < phase[i].length; j++) {
        houses.push(newtopology[0].IEEE13[unique[i]][j][phase[i][j]]);
      }
    }

    //console.log(phase)

    //console.log(houses)
    //Sum all houses
    const initialValue = 0;
    const sumWithInitial = houses.reduce(
    (previousValue, currentValue) => previousValue + currentValue,
    initialValue
    );

    //console.log(sumWithInitial)

    //await generateAddressessector(newtopology, oldtopology, sumWithInitial, unique)
    

    
    await generateAddresseshome(oldtopology, newtopology)

    await new Promise(resolve => setTimeout(resolve, 3000));

    await generateAddressessectorandphase(newtopology, oldtopology)
    

    res.send("Database Updated")
    
    
    async function generateAddressessectorandphase(newtopology, oldtopology) {

      

      var oldkeys = [];
      for (var k in oldtopology[0].IEEE13) oldkeys.push(k);

      var newkeys = [];
      for (var k in newtopology[0].IEEE13) newkeys.push(k);
      
      var p = []
      var phaseold = []
      for (let i = 0; i < oldkeys.length; i++) {
        for (let j = 0; j < oldtopology[0].IEEE13[oldkeys[i]].length; j++) {
          p.push(Object.keys(oldtopology[0].IEEE13[oldkeys[i]][j]).toString())
        }
        phaseold.push(p);
        p = []
      }

      
      

      var phasenew = []
      for (let i = 0; i < newkeys.length; i++) {
        for (let j = 0; j < newtopology[0].IEEE13[newkeys[i]].length; j++) {
          p.push(Object.keys(newtopology[0].IEEE13[newkeys[i]][j]).toString())
        }
        phasenew.push(p);
        p = []
      }

    for (let i = 0; i < oldkeys.length; i++) {
      for (let j = 0; j < phaseold[i].length; j++) {
        newtopology[0].IEEE13[oldkeys[i]][j][phaseold[i][j]] = oldtopology[0].IEEE13[oldkeys[i]][j][phaseold[i][j]]
      }
    }
    
    
    
    for (let i = 0; i < newkeys.length; i++) {
      for (let j = 0; j < phasenew[i].length; j++) {
        var aaaa = newtopology[0].IEEE13[newkeys[i]][j][phasenew[i][j]]
        if(!Array.isArray(aaaa)){
          var addresses = [];
          var privatekeys = [];

    for (let i = 0; i < aaaa; i++) {
      const wallet = ethers.Wallet.createRandom()
      addresses.push(wallet.address)
      privatekeys.push(wallet.privateKey)
    }
    // assign blockchain address to each home
    newtopology[0].IEEE13[newkeys[i]][j][phasenew[i][j]] = addresses
          
          }
             
      }
    }

    
    
    
    //console.log(util.inspect(newtopology, false, null, true /* enable colors */))
    
    if (collectionNames.includes('addresses1'))
        {
         db.collection('addresses1').drop(function(err, delOK) {
            if (err) throw err;
            if (delOK) console.log("Collection deleted");
          });
        }
    
       console.log("Creating Collections Addresses")
       db.collection('addresses1').insert(newtopology, function(error, record){
         if (error) throw error;
         console.log("Addresses Updated");
        });
    }; 
    




    async function generateAddresseshome(oldtopology, newtopology) { 

      //console.log(util.inspect(oldtopology, false, null, true /* enable colors */))

      //console.log(util.inspect(newtopology, false, null, true /* enable colors */))

      var oldkeys = [];
      for (var k in oldtopology[0].IEEE13) oldkeys.push(k);
      
      var p = []
      var phaseold = []
      for (let i = 0; i < oldkeys.length; i++) {
        for (let j = 0; j < oldtopology[0].IEEE13[oldkeys[i]].length; j++) {
          p.push(Object.keys(oldtopology[0].IEEE13[oldkeys[i]][j]).toString())
        }
        phaseold.push(p);
        p = []
      }

      var hsnew = 0
      var hsold = 0
      var hsoldarray = []
      for (let i = 0; i < oldkeys.length; i++) {
        for (let j = 0; j < phaseold[i].length; j++) {
          hsnew = newtopology[0].IEEE13[oldkeys[i]][j][phaseold[i][j]]
          hsold = oldtopology[0].IEEE13[oldkeys[i]][j][phaseold[i][j]].length
          hsoldarray = oldtopology[0].IEEE13[oldkeys[i]][j][phaseold[i][j]]
          if(hsnew != hsold){ 
            var privatekeys = [];
            console.log("i: ", i)
            console.log("j: ", j)

          for (let i = 0; i < (hsnew-hsold); i++) {
            const wallet = ethers.Wallet.createRandom()
            privatekeys.push(wallet.privateKey)
            hsoldarray.push(wallet.address)
          }
          
          }
        }
      }

      console.log(util.inspect(oldtopology, false, null, true /* enable colors */))

    }

    /*
    async function generateAddresseshome(newtopology, oldtopology, sumWithInitial, unique) {

      var p = []
      var phase = []
      for (let i = 0; i < unique.length; i++) {
        for (let j = 0; j < newtopology[0].IEEE13[unique[i]].length; j++) {
          p.push(Object.keys(newtopology[0].IEEE13[unique[i]][j]).toString())
        }
        phase.push(p);
        p = []
      }
      // Get houses in each phase
      var houses = []
      for (let i = 0; i < unique.length; i++) {
        for (let j = 0; j < phase[i].length; j++) {
          houses.push(newtopology[0].IEEE13[unique[i]][j][phase[i][j]]);
        }
      }

    console.log(houses)

      if(unique.length>0) {
        //Generate blockchain addresses for each house
        var addresses = [];
        var privatekeys = [];
    
        for (let i = 0; i < sumWithInitial; i++) {
          const wallet = ethers.Wallet.createRandom()
          addresses.push(wallet.address)
          privatekeys.push(wallet.privateKey)
        }
        // assign blockchain address to each home
        for (let i = 0; i < houses.length; i++) {
          var b = addresses.splice(0,houses[i]);
          p.push(b)
          
        }
        addresses = p;
        //console.log(addresses);
        //console.log(addresses)
    
        let index = 0
        // Add addresses in topology
        for (let i = 0; i < unique.length; i++) {
          for (let j = 0; j < phase[i].length; j++) {
            newtopology[0].IEEE13[unique[i]][j][phase[i][j]] = addresses[index];
            index = index+1; 
          }
        }
        
        console.log(addresses)

        var oldkeys = [];
        for (var k in oldtopology[0].IEEE13) oldkeys.push(k);

        for (var k in oldkeys) delete newtopology[0].IEEE13[oldkeys[k]];

        
        a = newtopology[0].IEEE13
        //console.log(a)
        b = oldtopology[0].IEEE13
        
        let merged = {...b, ...a};
        //console.log(merged)

        newtopology[0].IEEE13 = merged

      


      
        if (collectionNames.includes('addresses1'))
        {
         db.collection('addresses1').drop(function(err, delOK) {
            if (err) throw err;
            if (delOK) console.log("Collection deleted");
          });
        }
    
       console.log("Creating Collections Addresses")
       db.collection('addresses1').insert(newtopology, function(error, record){
         if (error) throw error;
         console.log("Data Saved");
        });
      }
      
        
        
       
        
         res.send("All is well")
        
      // Storing data in addresses collection
      
      } */
    
  }

  var addressResult = await getAddresses()
  
  var topologyResult = await getTopology()

  updateAddresses(addressResult, topologyResult)
  

  });

    

//Launch listening server on port 3000
app.listen(port, function () {
  console.log('app listening on port 3002!')
})
