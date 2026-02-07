// /functions/_middleware.js

/*
 *                         _oo0oo_
 *                        o8888888o
 *                        88" . "88
 *                        (| -_- |)
 *                        0\  =  /0
 *                      ___/`---'\___
 *                    .' \\|     |// '.
 *                   / \\|||  :  |||// \
 *                  / _||||| -:- |||||- \
 *                 |   | \\\  - /// |   |
 *                 | \_|  ''\---/''  |_/ |
 *                 \  .-\__  '-'  ___/-. /
 *               ___'. .'  /--.--\  `. .'___
 *            ."" '<  `.___\_<|>_/___.' >' "".
 *           | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *           \  \ `_.   \_ __\ /__ _/   .-` /  /
 *       =====`-.____`.___ \_____/___.-`___.-'=====
 *                         `=---='
 * 
 *       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *                      佛祖保佑       
 *                      永无BUG      
 *                      Cache Hit 100% 
 *                      KV Read 降低99%
 */
// /functions/_middleware.js
export async function onRequest(context) {
  const { request, next } = context;
  
  // 1. 先执行原有逻辑
  const response = await next();
  
  // 2. 如果是图片且成功，添加缓存头
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 200 && contentType.startsWith('image/')) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', 'public, max-age=86400'); // 1天
    newHeaders.set('CDN-Cache-Control', 'public, max-age=86400');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  return response;
}
