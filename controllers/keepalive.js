const KeepAlive=async(req,res)=>{
    console.log("This req is made to keep render always active");
    return res.json({success:true,message:"Request received successfully"});
}

module.exports={KeepAlive};