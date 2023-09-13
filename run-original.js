const ethers = require('ethers'); // connect to blockchain 
const INFURA_URL = process.env.INFURA_URL
const provider = new ethers.providers.JsonRpcProvider(INFURA_URL); //init providernpm
const { getAllApePoolNames,getApePoolData,getSushiPoolData, updateRouterData} = require('./helpers')

let tokenName =  "Wrapped Matic" //"Wrapped Matic" //USD Coin (PoS) ChainLink Token

const main = async() =>{
    //ape swap sushi swap data print all (for a given starting token(MATIC,USDC,UDST,DAI,AAVE,LINK, COMP))
    //calculate if opp is possible (including spread and gas fee)
    //change potential increase if opp is avialable
    //print increase,min requirement and swap data
    //dump into react component (later)
    //console.log(make trade and print json object data)

    /**
     * Get the a list of all the pools in apeswap for a given token
     * [LT]worth picking a token and the exhange first then checking back against the others but for now just pick token 
     */
    let AMOUNT = 10 //number of tokens purchased 

    let apePoolNames = await getAllApePoolNames(tokenName)
    //console.log(apePoolNames)

    for (let i = 0; i < apePoolNames.length; i++){
        
        /**
        * Get the pool data for the original exchange and the other exchanges 
        * [LT]For now just V2 and match on the names but long term we will have to actually search for match ups in V3 and V1.
        * Like V3 a
        */
        let apePoolData = await getApePoolData(apePoolNames[i],AMOUNT)
        
        
        let sushiPoolData = await getSushiPoolData(apePoolNames[i],AMOUNT)

        //The forloop should stop here why are we continueing we have the names
        //Just make another for loop 


        let __allPoolData = [...apePoolData, ...sushiPoolData];//combine all the pool data into one list 
        let _allPoolData = inputTokenMatch(__allPoolData)  //confirms the tokens in the pools match
        let allPoolData = updateRouterData(_allPoolData,AMOUNT) //refactor speed things up by doing everything in one loop especially this
        //this is not a good place to do this either
        //remove none 18 decimals so you can get router
       
        //Something has gone off the rails but atleast we have the prices 
        
        
        /**
         * This step needs to be revisted
         * Initially we were only checking for non empty
       
         * 
         * Original we also added everything to a list at the end but
         * Surely it makes more sense to work within this loop then add everything that works to the loop at the end 
         */
        if(allPoolData.length>1 ){ 
            //if there are atleast 2 pools and no wierd tokens were acquired 
            console.log(apePoolNames[i]) //name of the pool
           
            
             //ON refactor only pull prices here it will be faster long term and less intense on Node
        
            

            let minPoolData =  findMinObject(allPoolData, "ratioPrice1") //the pool with the lowest price for token 1
            let maxPoolData = findMaxObject(allPoolData, "ratioPrice1") //the pool with the lowest price for token 1

           
            
            console.log(maxPoolData)
            console.log(maxPoolData)

            
            let symbol0 = maxPoolData.inputTokens[0].symbol
            let symbol1 = maxPoolData.inputTokens[1].symbol
            let token1bought_init = maxPoolData.ratioPrice1 * AMOUNT //initial tokens purchased with Matic 
            let token0bought_revert = token1bought_init / minPoolData.ratioPrice1  //matic tokens recieved on completion of trade.
            
            console.log(`sell ${AMOUNT} ${symbol0}  for ${token1bought_init} ${symbol1}, on exchange:  ${maxPoolData.exchange} on MaxPool: ${maxPoolData.id}`) 
            console.log(`buy ${token0bought_revert} ${symbol0} with ${token1bought_init} ${symbol1}, on exchange:  ${minPoolData.exchange} on MinPool: ${minPoolData.id}  `)

            //we need to check if arbitrage is actually possible now 
            let GAS_FEE = 0.10 //gas fee in matic  (adjust for other tokens long term)
            let V2_POOL_FEE = 0.003
            let minimum_required_output = AMOUNT + GAS_FEE + (AMOUNT*V2_POOL_FEE)
            let profit = token0bought_revert-AMOUNT//get the profit 
            let profitAfterGas = token0bought_revert-minimum_required_output//get the profit 
            console.log("profit",profit)
            console.log("profit after gas",profitAfterGas)
            console.log(allPoolData.length)

           
            //get the minimum about need to get over fees (0.3% V2 fee and 0.10MATIC Polygon) 

        
            


            /*
            
            let token1bought = minPoolData.ratioPrice1
            let maticbought = token1bought *  (maxPoolData.ratioPrice1/maxPoolData.ratioPrice0)
            console.log("\n")
            console.log(`Token 1 bought for 1 matic ${token1bought}`)
            console.log(`Matic 1 bought for X token  ${maticbought}`)
            console.log(`Percentage increase: ${((maticbought-1)/1)*100}%`)
            console.log("\n")*/

            console.log("\nAll Pools")
            console.log(allPoolData)

            



            //you can actually combine they two arbitrage processes



            
                 
                
                
            
            

           
        }
 
    }

    



}

const inputTokenMatch = (allPoolData) =>{
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