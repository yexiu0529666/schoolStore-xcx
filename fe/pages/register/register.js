// pages/register/register.js
const { userApi } = require('../../utils/api');
const { validatePhone, validateEmail } = require('../../utils/util');

Page({
  data: {
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    isPasswordVisible: false,
    isConfirmPasswordVisible: false,
    isLoading: false,
    registerError: '',
    isAgree: false,
    registerType: 'phone', // phone 或 email
    verifyCode: '',
    countdown: 0,
    isSendingCode: false
  },

  onLoad: function() {
    // 页面加载
  },
  
  // 切换注册方式
  switchRegisterType: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      registerType: type,
      registerError: ''
    });
  },
  
  // 输入手机号
  inputPhone: function(e) {
    this.setData({
      phone: e.detail.value,
      registerError: ''
    });
  },
  
  // 输入邮箱
  inputEmail: function(e) {
    this.setData({
      email: e.detail.value,
      registerError: ''
    });
  },
  
  // 输入密码
  inputPassword: function(e) {
    this.setData({
      password: e.detail.value,
      registerError: ''
    });
  },
  
  // 输入确认密码
  inputConfirmPassword: function(e) {
    this.setData({
      confirmPassword: e.detail.value,
      registerError: ''
    });
  },
  
  // 输入昵称
  inputNickname: function(e) {
    this.setData({
      nickname: e.detail.value,
      registerError: ''
    });
  },
  
  // 输入验证码
  inputVerifyCode: function(e) {
    this.setData({
      verifyCode: e.detail.value,
      registerError: ''
    });
  },
  
  // 切换密码可见性
  togglePasswordVisibility: function() {
    this.setData({
      isPasswordVisible: !this.data.isPasswordVisible
    });
  },
  
  // 切换确认密码可见性
  toggleConfirmPasswordVisibility: function() {
    this.setData({
      isConfirmPasswordVisible: !this.data.isConfirmPasswordVisible
    });
  },
  
  // 同意协议
  toggleAgreement: function() {
    this.setData({
      isAgree: !this.data.isAgree
    });
  },
  
  // 表单验证
  validateForm: function() {
    // 验证昵称
    if (!this.data.nickname.trim()) {
      this.setData({ registerError: '请输入昵称' });
      return false;
    }
    
    // 根据注册类型验证信息
    if (this.data.registerType === 'phone') {
      // 验证手机号
      if (!this.data.phone) {
        this.setData({ registerError: '请输入手机号码' });
        return false;
      }
      
      if (!validatePhone(this.data.phone)) {
        this.setData({ registerError: '手机号码格式不正确' });
        return false;
      }
    } else {
      // 验证邮箱
      if (!this.data.email) {
        this.setData({ registerError: '请输入邮箱' });
        return false;
      }
      
      if (!validateEmail(this.data.email)) {
        this.setData({ registerError: '邮箱格式不正确' });
        return false;
      }
    }
    
    // 验证验证码
    if (!this.data.verifyCode) {
      this.setData({ registerError: '请输入验证码' });
      return false;
    }
    
    if (this.data.verifyCode.length !== 6) {
      this.setData({ registerError: '验证码应为6位数字' });
      return false;
    }
    
    // 验证密码
    if (!this.data.password) {
      this.setData({ registerError: '请输入密码' });
      return false;
    }
    
    if (this.data.password.length < 6) {
      this.setData({ registerError: '密码长度不能小于6位' });
      return false;
    }
    
    if (!this.data.confirmPassword) {
      this.setData({ registerError: '请确认密码' });
      return false;
    }
    
    if (this.data.password !== this.data.confirmPassword) {
      this.setData({ registerError: '两次输入的密码不一致' });
      return false;
    }
    
    // 验证协议
    if (!this.data.isAgree) {
      this.setData({ registerError: '请先同意用户协议和隐私政策' });
      return false;
    }
    
    return true;
  },
  
  // 获取验证码
  getVerifyCode: function() {
    if (this.data.isSendingCode || this.data.countdown > 0) {
      return;
    }
    
    if (this.data.registerType === 'phone') {
      if (!this.data.phone) {
        this.setData({ registerError: '请输入手机号码' });
        return;
      }
      
      if (!validatePhone(this.data.phone)) {
        this.setData({ registerError: '手机号码格式不正确' });
        return;
      }
    } else {
      if (!this.data.email) {
        this.setData({ registerError: '请输入邮箱' });
        return;
      }
      
      if (!validateEmail(this.data.email)) {
        this.setData({ registerError: '邮箱格式不正确' });
        return;
      }
    }
    
    this.setData({
      isSendingCode: true
    });
    
    // 构建请求参数
    const data = this.data.registerType === 'phone'
      ? { phone: this.data.phone }
      : { email: this.data.email };
    
    // 发送获取验证码请求
    userApi.sendVerifyCode(data)
      .then(() => {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
        
        // 开始倒计时
        this.setData({
          countdown: 60,
          isSendingCode: false
        });
        
        this.startCountdown();
      })
      .catch(err => {
        this.setData({
          registerError: err.message || '验证码发送失败，请稍后再试',
          isSendingCode: false
        });
      });
  },
  
  // 倒计时
  startCountdown: function() {
    const countdownInterval = setInterval(() => {
      if (this.data.countdown <= 1) {
        clearInterval(countdownInterval);
        this.setData({
          countdown: 0
        });
      } else {
        this.setData({
          countdown: this.data.countdown - 1
        });
      }
    }, 1000);
  },
  
  // 注册
  register: function() {
    if (!this.validateForm()) {
      return;
    }
    
    this.setData({ isLoading: true });
    
    // 构建注册数据
    const registerData = {
      nickname: this.data.nickname,
      password: this.data.password,
      verifyCode: this.data.verifyCode
    };
    
    if (this.data.registerType === 'phone') {
      registerData.phone = this.data.phone;
    } else {
      registerData.email = this.data.email;
    }
    
    // 发送注册请求
    userApi.register(registerData)
      .then(res => {
        const app = getApp();
        app.login(res.data.userInfo, res.data.token);
        
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      })
      .catch(err => {
        this.setData({ 
          registerError: err.message || '注册失败，请稍后再试',
          isLoading: false
        });
      });
  },
  
  // 返回登录页
  goToLogin: function() {
    wx.navigateBack();
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