// app.js
App({
  globalData: {
    userInfo: null,
    adminInfo: null,
    isLogin: false,
    isAdmin: false,
    isMerchant: false,
    baseUrl: 'http://localhost:5000/api',
    apiBaseUrl: 'http://localhost:5000', // 添加apiBaseUrl供文件上传使用
    token: '',
    pageParams: {}, // 用于存储页面间传递的参数
    pendingSharedCoupon: null // 用于存储待处理的分享优惠券
  },
  
  onLaunch: function() {
    // 获取本地存储的登录信息
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    const adminInfo = wx.getStorageSync('adminInfo');
    
    if (token) {
      this.globalData.token = token;  // 确保token被正确设置
      
      if (adminInfo) {
        // 管理员登录
        this.globalData.isAdmin = true;
        this.globalData.adminInfo = adminInfo;
        console.log("[APP] 已从本地存储获取管理员登录信息");
      } else if (userInfo) {
        // 普通用户登录
        this.globalData.isLogin = true;
        this.globalData.userInfo = userInfo;
        this.globalData.isMerchant = userInfo.is_merchant || false;
        console.log("[APP] 已从本地存储获取用户登录信息");
      }
    }
    
    // 检查更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(function(res) {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function() {
            wx.showModal({
              title: '更新提示',
              content: '新版本已准备好，是否重启应用？',
              success: function(res) {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
          
          updateManager.onUpdateFailed(function() {
            wx.showModal({
              title: '更新提示',
              content: '新版本下载失败，请检查网络后重试'
            });
          });
        }
      });
    }
  },
  
  // 封装请求方法
  request: function(options) {
    const token = wx.getStorageSync('token') || this.globalData.token;
    
    // 合并传入的header和默认header
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': token ? 'Bearer ' + token : '',
      ...(options.header || {})
    };
    
    console.log("[REQUEST] 发送请求:", {
      url: this.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      headers: headers
    });
    
    return new Promise((resolve, reject) => {
      console.log("[REQUEST] Authorization: ", token ? 'Bearer ' + token : 'No token');
      
      wx.request({
        url: this.globalData.baseUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: headers,
        success: (res) => {
          console.log("[REQUEST] 接收响应:", res.statusCode, res.data);
          
          if (res.statusCode === 401) {
            // 未登录或token过期，只清除登录状态，不自动跳转
            console.log("[REQUEST] 收到401未授权响应");
            this.globalData.isLogin = false;
            this.globalData.isAdmin = false;
            this.globalData.token = '';
            this.globalData.userInfo = null;
            this.globalData.adminInfo = null;
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            wx.removeStorageSync('adminInfo');
            
            // 直接reject，让调用方处理401错误
            reject(new Error('未登录或登录已过期'));
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            wx.showToast({
              title: res.data.message || '请求失败',
              icon: 'none'
            });
            reject(new Error(res.data.message || '请求失败'));
          }
        },
        fail: (err) => {
          console.log("[REQUEST] 请求失败", err);
          wx.showToast({
            title: '网络错误，请稍后再试',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },
  
  // 用户登录方法
  login: function(userInfo, token) {
    this.globalData.isLogin = true;
    this.globalData.userInfo = userInfo;
    this.globalData.token = token;
    this.globalData.isMerchant = userInfo.is_merchant || false;
    
    console.log("[LOGIN] 用户登录成功，保存token:", token);
    
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('token', token);
    
    // 检查是否有待处理的优惠券分享
    const pendingShare = this.globalData.pendingSharedCoupon;
    if (pendingShare && pendingShare.coupon_id && pendingShare.share_user_id) {
      // 如果有，优先处理优惠券分享
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/coupon-center/coupon-center?coupon_id=${pendingShare.coupon_id}&share_user_id=${pendingShare.share_user_id}`
        });
      }, 500);
    }
  },
  
  // 用户退出登录
  logout: function() {
    this.globalData.isLogin = false;
    this.globalData.isAdmin = false;
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.adminInfo = null;
    this.globalData.isMerchant = false;
    
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('adminInfo');
    
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
}) 