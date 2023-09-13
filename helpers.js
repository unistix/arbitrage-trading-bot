const axios = require('axios')
const ethers = require('ethers');
const routerArtifact = require('@uniswap/v2-periphery/build/UniswapV2Router02.json')
const JSBI = require('jsbi')

require('dotenv').config()
//const ETHERSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY
const INFURA_URL = process.env.MAINNET_URL

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);

const apeRouterAddress = '0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607';
const sushiRouterAddress = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
const routerAbi = routerArtifact.abi
const poolABI = require("./v2PoolABI.json")
const WETH9 = require("./WETH9.json")
const owner_address = process.env.WALLET_ADDRESS
const WALLET_SECRET = process.env.WALLET_SECRET


const apeRouter = new ethers.Contract(apeRouterAddress, routerAbi, provider);
const sushiRouter = new ethers.Contract(sushiRouterAddress, routerAbi, provider);


//for now get all ape pool names but later get names byt token 
exports.getAllApePoolNames = async (tokenName) => {
    let skipNo = 0 
    let timeExit = true //time exit is true of lpool.createdTimestamp = today
    let allApePoolNames = []
    while (timeExit){
      let apePoolsRaw = await getApePoolsFromGraphByToken(skipNo,tokenName)
      for (let i = 0; i < apePoolsRaw.length; i++) {

        let _name = apePoolsRaw[i].name.replace("ApeSwap ","")
        allApePoolNames.push(_name)
      }
      

      skipNo = skipNo + apePoolsRaw.length
      
      if (skipNo + apePoolsRaw.length ==  skipNo){
        timeExit = false
      }

    }

    return(allApePoolNames)




    
}


const getApePoolsFromGraph = async (skipNo) => {


  const URL = 'https://api.thegraph.com/subgraphs/name/messari/apeswap-polygon'
    //skip is going to be the value that allows you to iterate
    
    query = `
    

    {
      liquidityPools (
        first: 100
        skip: ${skipNo} 
      ) {
        name
      }
    }
    
    `
    //output token supply is active liquidity and output token price is avialable
    //loop through and just get all the pools
    // you can check ape swap back for prices afterwards too.

    await axios.post(URL, {query: query})
    .then((result) =>{
      pools =  result.data.data.liquidityPools
      
      //console.log(result.data)
      
    })

    return pools

}

const getApePoolsFromGraphByToken = async (skipNo,tokenName) => {
    let startToken = `ApeSwap ${tokenName}`
    

    const URL = 'https://api.thegraph.com/subgraphs/name/messari/apeswap-polygon'
      //skip is going to be the value that allows you to iterate
      
      query = `
      
  
      {
        liquidityPools (
          where: {name_starts_with: "${startToken}"},
          first: 100,
          skip: ${skipNo} 
          
        ) {
          name
        }
      }
      
      `
      //output token supply is active liquidity and output token price is avialable
      //loop through and just get all the pools
      // you can check ape swap back for prices afterwards too.
  
      await axios.post(URL, {query: query})
      .then((result) =>{
        pools =  result.data.data.liquidityPools
        
        //console.log(result.data)
        
      })
  
      return pools
  
  }

  exports.getApePoolData = async (name) => {


    const URL = 'https://api.thegraph.com/subgraphs/name/messari/apeswap-polygon'
      //skip is going to be the value that allows you to iterate
      
      query = `
      
  
      {
        liquidityPools(where: {name_contains: "${name}" }) {
          inputTokens {
            id
            decimals
            symbol
          }
          id
          inputTokenBalances
          name
        }
      }
      
      `
      //liquidityPools(where: {name_contains: ${name} }) {
      //output token supply is active liquidity and output token price is avialable
      //loop through and just get all the pools
      // you can check ape swap back for prices afterwards too.
  
      await axios.post(URL, {query: query})
      .then((result) =>{
        pools =  result.data.data.liquidityPools
        poolData = addCalcToPoolData(pools,"apeswap")
        
        //console.log(result.data)
        
      })
  
      return poolData
  
  }
  
  exports.getSushiPoolData = async (name,AMOUNT) => {
  
  
    const URL = 'https://api.thegraph.com/subgraphs/name/messari/sushiswap-polygon'
      //skip is going to be the value that allows you to iterate
      
      query = `
      
  
      {
        liquidityPools(where: {name_contains: "${name}" }) {
          inputTokens {
            id
            decimals
            symbol
          }
          id
          inputTokenBalances
          name
        }
      }
      
      `
      //liquidityPools(where: {name_contains: ${name} }) {
      //output token supply is active liquidity and output token price is avialable
      //loop through and just get all the pools
      // you can check ape swap back for prices afterwards too.
  
      await axios.post(URL, {query: query})
      .then(async (result) =>{
        pools =  result.data.data.liquidityPools
        poolData = await addCalcToPoolData(pools,"sushiswap",AMOUNT)
        
        //console.log(result.data)
        
      })
  
      return poolData
  
  }


  const addCalcToPoolData = async (poolData,exchange) =>{
    /**
     * This could potentially even come before inside get pool data 
     * Calculate the price and liquidity for each pool add exchange as an attribute to the poolData object
     * Check that liqudity is about 0 before adding it to the list 
     * This might cause some gaps which is why we removed empties.
     */

    _poolData = []

    for (let i = 0; i < poolData.length; i++){
      
        
        let liquidity0 =  Number(poolData[i].inputTokenBalances[0])
        let liquidity1 = Number(poolData[i].inputTokenBalances[1])

      
        if (liquidity0 >100 && liquidity1 >100){ //if liquidity is 0 do not add to the list //inputTokenMatch && 

         
            let price0 = liquidity0/liquidity1 //JSBI.divide(liquidity0,liquidity1) //liquidity0/liquidity1 //BIG NUMBER
            let price1 = liquidity1/liquidity0//JSBI.divide(liquidity1,liquidity0) //BIG NUMBER

         
            poolData[i].liquidity0 = liquidity0 //it might be worth using big number division and converting the result
            poolData[i].liquidity1 = liquidity1
            poolData[i].exchange = exchange
            poolData[i].price0 = price0 //it might be worth using big number division and converting the result
            poolData[i].price1 = price1
            
            
            _poolData.push(poolData[i])

        }
        



    }
    return _poolData


  }
  


  
  
  
  
  const getReserveData= async (poolAddress) => {
      //get pool immutables just reads data from the pool contract
      //get more immutables instead of duplicating then pass immutables in for basetoken
      //const poolABI = await getAbi(poolAddress)
      const poolContract = new ethers.Contract(
      poolAddress,
      poolABI,
      provider
    )
      
      const res = await poolContract.getReserves()


    
      
      return res
    }

    const getRouterData= async (poolData,exchange,AMOUNT) => {

      let routerAddress 
      let PATH = [poolData.inputTokens[0].id,poolData.inputTokens[1].id]
      console.log(poolData.inputTokens)
      if(exchange==="sushiswap"){

        routerAddress = sushiRouterAddress
        

        

      }
      else if(exchange==="apeswap"){
        
        routerAddress = apeRouterAddress
        
  
       
      }else{
        console.log("exchange missing")
      }

      let router = new ethers.Contract(
        routerAddress,
        routerArtifact.abi,
        provider
      )
    

      let amounts = await router.getAmountsOut(AMOUNT,PATH)
      

      return amounts

      
    
    }

  const logBalance = async (token0, token1, decimals0, decimals1) => {
    
    //get token balances in the wallet
    let tokenContract0 = new ethers.Contract(
      token0,
      WETH9.abi,
      provider
    )

    let tokenContract1 = new ethers.Contract(
      token1,
      WETH9.abi,
      provider
    )

   


    
    const ownerContractBalance0 = await tokenContract0.balanceOf(owner_address);
    const ownerContractBalance1 = await tokenContract1.balanceOf(owner_address);

    console.log("owner wallet balance token0:", ethers.utils.formatUnits(String(ownerContractBalance0),decimals0) ) //make sure to get the decimals for the contract for easy reading
    console.log("owner wallet contract balance token1:", ethers.utils.formatUnits(String(ownerContractBalance1),decimals1))

     
  
  }

 
    

  exports.makeTrade = async (tradeData) =>{
    //const owner = await ethers.getSigners()
    let tokenContract0 = new ethers.Contract(
      tradeData.init_token0,
      WETH9.abi,
      provider
    )

    let tokenContract1 = new ethers.Contract(
      tradeData.init_token1,
      WETH9.abi,
      provider
    )

    
    let router = await getRouter(tradeData.init_exchange) //get the correct router
    console.log(router.address)
    


    let gasPrice = await provider.getGasPrice()
    let gasPriceGWEI = ethers.utils.formatUnits(gasPrice, "gwei")
    let gasBuffered = Math.round(gasPriceGWEI + 10)
    console.log(`gas price ${gasBuffered.toString()}`)

    //log wallet balance again
    const wallet = new ethers.Wallet(WALLET_SECRET)
    const connectedWallet = wallet.connect(provider)
    let PATH = [tradeData.init_token0,tradeData.init_token1]
    
    await logBalance(PATH[0],PATH[1], tradeData.init_decimals0, tradeData.init_decimals1) //check the wallet balance and log it 

    //REVERT
    
    console.log("start init trade")
    let init_approvalAmount = ethers.utils.parseUnits(String(tradeData.init_AMOUNT_IN), tradeData.init_decimals0)
    let init_outputAmount = ethers.utils.parseUnits(String(tradeData.init_AMOUNT_OUT_P), tradeData.init_decimals1)
    

   
   
    //approve the swap
    const approvalTx = await tokenContract0.connect(connectedWallet).approve(
      router.address,
      init_approvalAmount,
      {gasLimit: ethers.utils.hexlify(200000), //this is optimum gas for approval
        gasPrice: ethers.utils.parseUnits(gasBuffered.toString(), "gwei")}
    )
    await approvalTx.wait() //wait for the approval response 

    const approvalReceipt = await provider.waitForTransaction(approvalTx.hash).then(
      approvalReceipt => {  
        console.log(approvalReceipt.status)
        console.log("init approved")
      })
   
    
        
    //run the swap transaction
    try{
    const init_tx = await router.connect(connectedWallet).swapExactTokensForTokens( //if not matic use something else
        init_approvalAmount, //specify about of tokens we want to pass into swap in WEI
        1, //set mimum to 1 to make sure output comes out - input + fee
        PATH, //trading pair path
        owner_address, //address to send tokens to 
        Math.floor(Date.now() / 1000) + (60 * 100),//deadline
        {gasLimit: ethers.utils.hexlify(200000),
          gasPrice: ethers.utils.parseUnits(gasBuffered.toString(), "gwei")}

      )
      console.log("wait for init trade")
      await init_tx.wait()
  
    
      const initReceipt = await provider.waitForTransaction(init_tx.hash).then(
        initReceipt => {  console.log(initReceipt)})
        console.log("init trade completed") //if status is 0
        
        const ownerContractBalance1 = await tokenContract1.balanceOf(owner_address);
        tradeData.init_AMOUNT_OUT_A = ownerContractBalance1 
        /*
        DO NOT DO THIS 
         console.log(initReceipt)
        */
         //console.log()
         //initReceipt.logs - logs where address is token 0
        //tradeData.init_AMOUNT_OUT_A = 0
       


        
      }catch{
        console.log(err)
        console.log("init trade failed")}
    await logBalance(PATH[0],PATH[1], tradeData.init_decimals0, tradeData.init_decimals1)

        //REVERT

        //get new gas cost
    console.log("start revert trade")

    let rev_router = await getRouter(tradeData.rev_exchange)//get new router
   

    gasPrice = await provider.getGasPrice()
    gasPriceGWEI = ethers.utils.formatUnits(gasPrice, "gwei")
    gasBuffered = Math.round(gasPriceGWEI + 10)
    console.log(`gas price ${gasBuffered.toString()}`)//get new gas fees

    rev_PATH = [tradeData.init_token1,tradeData.init_token0] //reverse the path
    console.log(tradeData.init_AMOUNT_OUT_A)
    let rev_approvalAmount = tradeData.init_AMOUNT_OUT_A // already converted from previous output ethers.utils.parseUnits(String(tradeData.init_AMOUNT_OUT_A), tradeData.init_decimals1)

    const rev_approvalTx = await tokenContract1.connect(connectedWallet).approve(
      rev_router.address,
      rev_approvalAmount,
      {gasLimit: ethers.utils.hexlify(200000), //this is optimum gas for approval
        gasPrice: ethers.utils.parseUnits(gasBuffered.toString(), "gwei")}
    )
    await rev_approvalTx.wait() //wait for the approval response 

    const rev_approvalReceipt = await provider.waitForTransaction(approvalTx.hash).then(
      approvalReceipt => {  
        console.log(approvalReceipt.status)
        console.log("revert approved")
        })
    
    

    try{
      const rev_tx = await router.connect(connectedWallet).swapExactTokensForTokens( //if not matic use something else
          rev_approvalAmount, //specify about of tokens we want to pass into swap in WEI
          1, //set mimum to 1 to make sure output comes out - input + fee
          rev_PATH, //trading pair path
          owner_address, //address to send tokens to 
          Math.floor(Date.now() / 1000) + (60 * 100),//deadline
          {gasLimit: ethers.utils.hexlify(200000),
            gasPrice: ethers.utils.parseUnits(gasBuffered.toString(), "gwei")}
  
        )
        console.log("wait for rev trade")
        await rev_tx.wait()
    
      
        const revReceipt = await provider.waitForTransaction(rev_tx.hash).then(
          revReceipt => {  console.log(revReceipt)})
          console.log("rev trade completed") //if status is 0
  
          /*const ownerContractBalance0 = await tokenContract0.balanceOf(owner_address);
          tradeData.rev_AMOUNT_OUT_A = ownerContractBalance0*/

          //could be worth getting balance from transaction data
  
          
        }catch(err){
          console.log(err)
          console.log("rev trade failed")
        
        }



      




    

    
    //const init_tx = await router.connect(owner).swapExactTokensForTokens( //similar to exactin on uniswap V3
    
    //get transaction result

    //update trade data
   

    //make reverted trade 

    //the init_AMOUNT_OUT is rev_AMOUNT_IN
 

    //log wallet balance again
    await logBalance(PATH[0],PATH[1], tradeData.init_decimals0, tradeData.init_decimals1)
    return tradeData
  }
  exports.updateRouterData = async ( allPoolData,AMOUNT) => {

      resultList = []

      for (const poolData of allPoolData) {

        let routerAddress 
        let PATH = [poolData.inputTokens[0].id,poolData.inputTokens[1].id]
        
        //createselect router function and pass in exchange and return a router object.
        if(poolData.exchange==="sushiswap"){

          routerAddress = sushiRouterAddress
    
        }
        else if(poolData.exchange==="apeswap"){
          
          routerAddress = apeRouterAddress

        
        }else{
          console.log("exchange missing")
        }

        try{
          let router = new ethers.Contract(
            routerAddress,
            routerArtifact.abi,
            provider
          )
          let amounts = await router.getAmountsOut(AMOUNT,PATH)
          let price0 = Number(amounts[0]/amounts[1]) //JSBI.divide(liquidity0,liquidity1) //liquidity0/liquidity1 //BIG NUMBER
          let price1 = Number(amounts[1]/amounts[0])

          if(price0!==Infinity && price1!==Infinity){
            poolData.ratioPrice0 =  price0
            poolData.ratioPrice1 =  price1

            resultList.push(poolData)

            
            
           

          }
  
          

        }catch(err){
          console.log(err)
          continue
          
        }
      }

      return(resultList)


    }

const getRouter = async (exchange) => {
  let routerAddress
  let router

  if(exchange==="sushiswap"){

    routerAddress = sushiRouterAddress

  }
  else if(exchange==="apeswap"){
    
    routerAddress = apeRouterAddress

  
  }else{
    console.log("exchange missing")
  }

 
      router = new ethers.Contract(
      routerAddress,
      routerArtifact.abi,
      provider
      )

  return router

}

  
 