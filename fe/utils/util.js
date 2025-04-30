/**
 * 格式化时间
 * @param {Date} date 日期对象
 * @param {String} format 格式字符串，如 yyyy-MM-dd HH:mm:ss
 * @return {String} 格式化后的日期字符串
 */
const formatTime = (date, format = 'yyyy-MM-dd HH:mm:ss') => {
  if (!date) return '';
  if (typeof date === 'string') {
    date = new Date(date.replace(/-/g, '/'));
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return format
    .replace(/yyyy/g, year)
    .replace(/MM/g, month < 10 ? '0' + month : month)
    .replace(/dd/g, day < 10 ? '0' + day : day)
    .replace(/HH/g, hour < 10 ? '0' + hour : hour)
    .replace(/mm/g, minute < 10 ? '0' + minute : minute)
    .replace(/ss/g, second < 10 ? '0' + second : second);
};

/**
 * 价格格式化
 * @param {Number} price 价格
 * @param {Number} decimals 小数位数
 * @return {String} 格式化后的价格
 */
const formatPrice = (price, decimals = 2) => {
  if (isNaN(price) || price === '' || price === null) return '0.00';
  
  price = parseFloat(price);
  return price.toFixed(decimals);
};

/**
 * 生成随机字符串
 * @param {Number} length 字符串长度
 * @return {String} 随机字符串
 */
const randomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * 检查手机号码格式
 * @param {String} phone 手机号码
 * @return {Boolean} 是否合法
 */
const validatePhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * 检查邮箱格式
 * @param {String} email 邮箱
 * @return {Boolean} 是否合法
 */
const validateEmail = (email) => {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(email);
};

/**
 * 获取元素样式
 * @param {Object} selector 选择器
 * @param {Object} context 上下文
 * @return {Promise} Promise对象
 */
const getRect = (selector, context = null) => {
  return new Promise((resolve) => {
    const query = context ? wx.createSelectorQuery().in(context) : wx.createSelectorQuery();
    query.select(selector).boundingClientRect((rect) => {
      resolve(rect);
    }).exec();
  });
};

/**
 * 截取字符串
 * @param {String} str 字符串
 * @param {Number} length 截取长度
 * @param {String} suffix 后缀
 * @return {String} 截取后的字符串
 */
const truncateString = (str, length = 20, suffix = '...') => {
  if (!str) return '';
  
  if (str.length <= length) {
    return str;
  }
  
  return str.substring(0, length) + suffix;
};

/**
 * 防抖函数
 * @param {Function} fn 需要防抖的函数
 * @param {Number} delay 延迟时间，单位毫秒
 * @return {Function} 防抖后的函数
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  
  return function(...args) {
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn 需要节流的函数
 * @param {Number} interval 间隔时间，单位毫秒
 * @return {Function} 节流后的函数
 */
const throttle = (fn, interval = 300) => {
  let last = 0;
  
  return function(...args) {
    const now = Date.now();
    
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 计算两个日期之间的天数
 * @param {Date} startDate 开始日期
 * @param {Date} endDate 结束日期
 * @return {Number} 天数
 */
const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 将时间调整到当天 0 点以消除时分秒的影响
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * 获取当前日期字符串 yyyy-MM-dd
 * @return {String} 日期字符串
 */
const getCurrentDate = () => {
  return formatTime(new Date(), 'yyyy-MM-dd');
};

/**
 * 将对象序列化为 URL 参数字符串
 * @param {Object} obj 对象
 * @return {String} URL 参数字符串
 */
const objectToQueryString = (obj) => {
  if (!obj) return '';
  
  return Object.keys(obj)
    .filter(key => obj[key] !== undefined && obj[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
};

/**
 * 将 URL 参数字符串解析为对象
 * @param {String} str URL 参数字符串
 * @return {Object} 解析后的对象
 */
const queryStringToObject = (str) => {
  if (!str) return {};
  
  const params = {};
  const queries = str.split('&');
  
  for (let i = 0; i < queries.length; i++) {
    const [key, value] = queries[i].split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }
  
  return params;
};

module.exports = {
  formatTime,
  formatPrice,
  randomString,
  validatePhone,
  validateEmail,
  getRect,
  truncateString,
  debounce,
  throttle,
  daysBetween,
  getCurrentDate,
  objectToQueryString,
  queryStringToObject
}; 