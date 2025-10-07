export async function handler(event){
  try{
    const {lat,lon,lang='ru_RU'}=event.queryStringParameters||{};
    if(!lat||!lon)return{statusCode:400,body:'lat & lon required'};
    const res=await fetch(`https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&lang=${lang}&limit=1&hours=false`,{
      headers:{'X-Yandex-API-Key':process.env.YA_WEATHER_API_KEY}
    });
    const text=await res.text();
    return{statusCode:res.status,body:text,headers:{'Content-Type':'application/json'}};
  }catch(e){return{statusCode:500,body:JSON.stringify({error:String(e)})};}
}