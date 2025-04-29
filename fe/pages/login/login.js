// pages/login/login.js
const app = getApp();
const { userApi } = require('../../utils/api');
const { validatePhone } = require('../../utils/util');

Page({
  data: {
    phone: '',
    password: '',
    username: '', // 管理员账号
    isPasswordVisible: false,
    isLoading: false,
    loginType: 'phone', // phone 或 wx 或 admin
    loginError: '',
    isAgree: false,
    redirect: ''
  },

  onLoad: function(options) {
    if (options.redirect) {
      this.setData({
        redirect: decodeURIComponent(options.redirect)
      });
    }
  },
  
  onShow: function() {
    // 检查是否已经登录
    const token = wx.getStorageSync('token');
    if (token) {
      // 已登录，判断是否需要处理优惠券分享
      const pendingShare = app.globalData.pendingSharedCoupon;
      if (pendingShare && pendingShare.coupon_id && pendingShare.share_user_id) {
        // 跳转到优惠券中心页面，并传递参数
        wx.redirectTo({
          url: `/pages/coupon-center/coupon-center?coupon_id=${pendingShare.coupon_id}&share_user_id=${pendingShare.share_user_id}`
        });
        // 清除待处理分享
        app.globalData.pendingSharedCoupon = null;
      } else if (this.data.redirect) {
        // 有重定向页面，跳转过去
        wx.redirectTo({
          url: this.data.redirect
        });
      } else {
        // 没有重定向，回到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    }
  },
  
  // 切换登录方式
  switchLoginType: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      loginType: type,
      loginError: ''
    });
  },
  
  // 输入手机号
  inputPhone: function(e) {
    this.setData({
      phone: e.detail.value,
      loginError: ''
    });
  },
  
  // 输入管理员账号
  inputUsername: function(e) {
    this.setData({
      username: e.detail.value,
      loginError: ''
    });
  },
  
  // 输入密码
  inputPassword: function(e) {
    this.setData({
      password: e.detail.value,
      loginError: ''
    });
  },
  
  // 切换密码可见性
  togglePasswordVisibility: function() {
    this.setData({
      isPasswordVisible: !this.data.isPasswordVisible
    });
  },
  
  // 同意协议
  toggleAgreement: function() {
    this.setData({
      isAgree: !this.data.isAgree
    });
  },
  
  // 去注册页面
  goToRegister: function() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },
  
  // 忘记密码
  goToForgotPassword: function() {
    wx.navigateTo({
      url: '/pages/forgot-password/forgot-password'
    });
  },
  
  // 表单验证
  validateForm: function() {
    if (this.data.loginType === 'phone') {
      if (!this.data.phone) {
        this.setData({ loginError: '请输入手机号码' });
        return false;
      }
      
      if (!validatePhone(this.data.phone)) {
        this.setData({ loginError: '手机号码格式不正确' });
        return false;
      }
    } else if (this.data.loginType === 'admin') {
      if (!this.data.username) {
        this.setData({ loginError: '请输入管理员账号' });
        return false;
      }
    }
    
    if (this.data.loginType !== 'wx') {
      if (!this.data.password) {
        this.setData({ loginError: '请输入密码' });
        return false;
      }
      
      if (this.data.password.length < 6) {
        this.setData({ loginError: '密码长度不能小于6位' });
        return false;
      }
    }
    
    if (!this.data.isAgree) {
      this.setData({ loginError: '请先同意用户协议和隐私政策' });
      return false;
    }
    
    return true;
  },
  
  // 手机号登录
  login: function() {
    if (!this.validateForm()) {
      return;
    }
    
    this.setData({ isLoading: true });
    
    const loginData = {
      phone: this.data.phone,
      password: this.data.password
    };
    
    userApi.login(loginData)
      .then(res => {
        app.login(res.data.userInfo, res.data.token);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          if (this.data.redirect) {
            wx.redirectTo({
              url: this.data.redirect
            });
          } else {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        }, 1500);
      })
      .catch(err => {
        this.setData({ 
          loginError: err.message || '登录失败，请稍后再试',
          isLoading: false
        });
      });
  },
  
  // 管理员登录
  adminLogin: function() {
    if (!this.validateForm()) {
      return;
    }
    
    this.setData({ isLoading: true });
    
    const loginData = {
      username: this.data.username,
      password: this.data.password
    };
    
    userApi.adminLogin(loginData)
      .then(res => {
        // 保存管理员信息
        app.globalData.adminInfo = res.data.adminInfo;
        app.globalData.isAdmin = true;
        app.globalData.token = res.data.token; // 使用相同的token字段
        
        // 保存到本地存储
        wx.setStorageSync('adminInfo', res.data.adminInfo);
        wx.setStorageSync('token', res.data.token); // 使用相同的token存储键
        
        console.log("[ADMIN LOGIN] 管理员登录成功，保存token:", res.data.token);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/merchant/dashboard/dashboard'
          });
        }, 1500);
      })
      .catch(err => {
        this.setData({ 
          loginError: err.message || '管理员登录失败，请检查账号密码',
          isLoading: false
        });
      });
  },
  
  // 微信一键登录
  wxLogin: function() {
    if (!this.data.isAgree) {
      this.setData({ loginError: '请先同意用户协议和隐私政策' });
      return;
    }
    
    this.setData({ isLoading: true });
    
    wx.login({
      success: (res) => {
        if (res.code) {
          userApi.wxLogin(res.code)
            .then(res => {
              console.log('[WX_LOGIN] 登录成功，准备保存信息');
              
              // 先清除待处理的优惠券分享，避免干扰跳转
              app.globalData.pendingSharedCoupon = null;
              
              // 保存登录信息
              app.globalData.isLogin = true;
              app.globalData.userInfo = res.data.userInfo;
              app.globalData.token = res.data.token;
              app.globalData.isMerchant = res.data.userInfo.is_merchant || false;
              
              // 保存到本地存储
              wx.setStorageSync('userInfo', res.data.userInfo);
              wx.setStorageSync('token', res.data.token);
              
              console.log('[WX_LOGIN] 信息保存完成，准备跳转');
              
              // 显示成功提示
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
              
              // 使用reLaunch进行跳转
              setTimeout(() => {
                console.log('[WX_LOGIN] 开始执行跳转');
                if (this.data.redirect) {
                  console.log('[WX_LOGIN] 跳转到重定向页面:', this.data.redirect);
                  wx.reLaunch({
                    url: this.data.redirect,
                    success: () => {
                      console.log('[WX_LOGIN] 重定向跳转成功');
                    },
                    fail: (err) => {
                      console.error('[WX_LOGIN] 重定向跳转失败:', err);
                    }
                  });
                } else {
                  console.log('[WX_LOGIN] 跳转到首页');
                  wx.reLaunch({
                    url: '/pages/index/index',
                    success: () => {
                      console.log('[WX_LOGIN] 首页跳转成功');
                    },
                    fail: (err) => {
                      console.error('[WX_LOGIN] 首页跳转失败:', err);
                    }
                  });
                }
              }, 1000);
            })
            .catch(err => {
              console.error('[WX_LOGIN] 登录失败:', err);
              this.setData({ 
                loginError: err.message || '登录失败，请稍后再试',
                isLoading: false
              });
            });
        } else {
          console.error('[WX_LOGIN] 获取微信code失败');
          this.setData({ 
            loginError: '微信登录失败，请稍后再试',
            isLoading: false
          });
        }
      },
      fail: () => {
        console.error('[WX_LOGIN] 微信登录失败');
        this.setData({ 
          loginError: '微信登录失败，请稍后再试',
          isLoading: false
        });
      }
    });
  },
  
  // 查看用户协议
  viewUserAgreement: function() {
    // 跳转到用户协议页面
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=user'
    });
  },
  
  // 查看隐私政策
  viewPrivacyPolicy: function() {
    // 跳转到隐私政策页面
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=privacy'
    });
  }
}) 