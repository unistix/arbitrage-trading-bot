const ethers = require('ethers'); // connect to blockchain 
const INFURA_URL = process.env.INFURA_URL
const provider = new ethers.providers.JsonRpcProvider(INFURA_URL); //init providernpm
const { getAllApePoolNames,getApePoolData,getSushiPoolData, updateRouterData, makeTrade} = require('./helpers')

let tokenName =  "Wrapped Matic" //"Wrapped Matic" //USD Coin (PoS) ChainLink Token

const main = async() =>{
    
    let AMOUNT = 2 //number of tokens purchased 

    let apePoolNames = await getAllApePoolNames(tokenName) //Get the a list of all the pools in apeswap for a given token
    //this is somewhat overcomplicated
    //once we have the intersection pools 
    //we can just run with the tokens on the swap router
    //pool [{ape pair},{sushi pair}. Then fill in the price stuff.

    for (let i = 0; i < apePoolNames.length; i++){// iterate through each pool name to get the data for various pairs 
        console.log(apePoolNames[i])
        
        let apePoolData = await getApePoolData(apePoolNames[i])
        
        
        let sushiPoolData = await getSushiPoolData(apePoolNames[i])

        //The forloop should stop here why are we continueing we have the names
        //Just make another for loop 


        let allPoolData = [...apePoolData, ...sushiPoolData];//combine the ape pools and sushi pools into one list.
        allPoolData = inputTokenMatch(allPoolData)  //confirms the tokens in the pools match and remove anywhich do not

        
        if(allPoolData.length>1){ //check there are atleast two pools in the list. Can work with more but need atleast two
          
          allPoolData = await updateRouterData(allPoolData,AMOUNT) //use the swap router to get an accurate price for the - router price and actually price are very close
          if(allPoolData.length>1){  //check there are atleast two pools in the list. Can work with more but need atleast two, some pools might not return price from router
            //check that 
            
            
            //get the minimum and max pools to trade in
          
            //let minPoolData =  findMinObject(allPoolData, "price0") //the pool with the lowest price for token 1
            //let maxPoolData = findMaxObject(allPoolData, "price1") //the pool with the lowest price for token 1

            let initPoolData = findMaxObject(allPoolData, "price1") //buy token1 in the pool with the highest price for token 1
            let revPoolData = findMaxObject(allPoolData, "price0") //buy token0 in the pool with the highest price for token 0

            //makesure initand rev poolid are not the same pool

            let symbol0 = initPoolData.inputTokens[0].symbol
            let symbol1 = initPoolData.inputTokens[1].symbol
            let token1bought_init = initPoolData.price1 * AMOUNT //initial tokens purchased with Matic 
            let token0bought_revert = token1bought_init * revPoolData.price0 //matic tokens recieved on completion of trade.


            //show outcome of trade
            

            //show outcome of trade
            let GAS_FEE = 0.10 //gas fee in matic  (adjust for other tokens long term)
            let V2_POOL_FEE = 0.003
            let minimum_required_output = AMOUNT + GAS_FEE + (AMOUNT*V2_POOL_FEE)
            let profit = token0bought_revert-AMOUNT//get the profit 
            let profitAfterGas = token0bought_revert-minimum_required_output//get the profit 
            

            //check profit aftergas is above 1 
            //eventual just check that pool isn't in list of named pools
            if(profitAfterGas>1 && token1bought_init>0.00005 && apePoolNames[i]!== "Wrapped Matic/Sing Token" && apePoolNames[i]!== "Wrapped Matic/HYPERTET"){ //check that token being bought is more than 0.000002 etc
              console.log(apePoolNames[i])
              console.log(`sell ${AMOUNT} ${symbol0}  for ${token1bought_init} ${symbol1}, on exchange:  ${initPoolData.exchange} on MaxPool: ${initPoolData.id}`) 
              console.log(`buy ${token0bought_revert} ${symbol0} with ${token1bought_init} ${symbol1}, on exchange:  ${revPoolData.exchange} on MinPool: ${revPoolData.id}  `)
              console.log("profit",profit)
              console.log("profit after gas",profitAfterGas)
             

              console.log("MAKE TRADE")
              let tradeData = {
                init_token0:initPoolData.inputTokens[0].id,
                init_token1:initPoolData.inputTokens[1].id,
                init_decimals0:initPoolData.inputTokens[0].decimals,
                init_decimals1:initPoolData.inputTokens[1].decimals,
                init_AMOUNT_IN:AMOUNT,
                init_AMOUNT_OUT_P:token1bought_init,
                init_AMOUNT_OUT_A:0,
                init_exchange:initPoolData.exchange,

                rev_token0:revPoolData.inputTokens[1].id,
                rev_token1:revPoolData.inputTokens[0].id,
                rev_decimals0:revPoolData.inputTokens[1].decimals,
                rev_decimals1:revPoolData.inputTokens[0].decimals,


                rev_exchange:revPoolData.exchange,
              }
              let tradeResult = await makeTrade(tradeData)
              console.log(tradeResult)
              break

            

            }
              

            //console.log all pool data if the profit is above a certain value then make a trade.
          }

          //we need to calculate the price from the pool contract
          //calculate the mimumums
          //then calculate the opportunity
          //only print if there is an opp
        }
       
       
        
        
    }

}

const inputTokenMatch = (allPoolData) =>{
  /**
   * confirms the tokens in the pools match and remove anywhich do not
   */
  let objects = allPoolData
  

  const propertyCounts = {}; // Object to store property value counts.
  const filteredObjects = [];

  // Count the occurrences of each property value.
  for (const obj of objects) {
    const value = obj.inputTokens[1].id;
    propertyCounts[value] = (propertyCounts[value] || 0) + 1;
  }

  // Add objects with duplicated property values to the filteredObjects array.
  for (const obj of objects) {
    const value = obj.inputTokens[1].id;

    if (propertyCounts[value] > 1) {
      filteredObjects.push(obj);
    }
  }

  return filteredObjects;
  
}

const removeComplexDecimals = (allPoolData) =>{
  const filteredObjects = [];
  for (const poolData of allPoolData) {
    if (poolData.inputTokens[1].decimals==18 && poolData.inputTokens[0].decimals==18){
        filteredObjects.push(poolData)
    }
    
  }
  return filteredObjects;

}

function findMaxObject(objectList, property) {
  if (!Array.isArray(objectList) || objectList.length === 0) {
    return null; // Return null or handle empty input list as needed
  }

  const maxObject = objectList.reduce((max, current) => {
    if (current[property] > max[property]) {
      return current;
    } else {
      return max;
    }
  }, objectList[0]);

  return maxObject;
}

function findMinObject(objectList, property) {
  if (!Array.isArray(objectList) || objectList.length === 0) {
    return null; // Return null or handle empty input list as needed
  }

  const minObject = objectList.reduce((min, current) => {
    if (current[property] < min[property]) {
      return current;
    } else {
      return min;
    }
  }, objectList[0]);

  return minObject;
}

main()