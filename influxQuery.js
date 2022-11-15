const {InfluxDB, consoleLogger} = require('@influxdata/influxdb-client')

const influxToken = 'KrUZPCqJcuNmvbQtfL8TL_ZULcFT0mjGHOLQ4v1ZLNjXaKtq3Pgbke7wpUVjU-j_RnLtOLP_teU1NAG_OUTDnA=='
const org = 'Simulations'
const client = new InfluxDB({url: "http://127.0.0.1:8086", token: influxToken})

async function getMongoData() {
await queryExample(`\
      from(bucket:"simulation_ieee_13")\
      |> range(start: 2018-12-10T00:00:00Z, stop: 2018-12-10T23:59:59Z)\
      |> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Iterations0")\
      |> filter(fn: (r) => r["_field"] == "total_consumption")\
      |> filter(fn: (r) => r["node"] == "N611")\
      |> filter(fn: (r) => r["phase"] == "PHC")\
      |> filter(fn: (r) => r["user"] == "2")\
      `)
}
async function queryExample(fluxQuery) {
    var arr = [];
    console.log('\n*** QUERY ***')
  
    // Getting data from influxDB
    const queryApi = client.getQueryApi(org)
  
    
    try {
      
      //var startTime = new Date();
      
        const data = await queryApi.collectRows(
        fluxQuery 
       )
       //console.log(data)
       data.forEach((i) => arr.push(JSON.stringify(i._value)))
  
       var arrays = [], size = 144;
      
      for (let i = 0; i < arr.length; i += size) {
        arrays.push(arr.slice(i, i + size));
      }
      //Putting data in respective variables
      var Total_Consumption_Real = arrays[0].map(function(each_element){
        return Number(each_element).toFixed(3);
      });
    
      var Total_Consumption_Initial = arrays[1].map(function(each_element){
        return Number(each_element).toFixed(3);
      });
  
      var Total_Consumption_Final = arrays[2].map(function(each_element){
        return Number(each_element).toFixed(3);
      })
      ;
      console.log(Total_Consumption_Real)
      console.log(Total_Consumption_Initial)
      console.log(Total_Consumption_Final)
  
      
    
    } catch (e) {
      console.error(e)
      console.log('\nCollect ROWS ERROR')
    }
    
    
  }


  getMongoData()