// pages/user/user.js
const app = getApp();
const { userApi, orderApi, couponApi } = require('../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    orderCount: {
      pending: 0,
      paid: 0,
      shipped: 0
    },
    couponCount: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.checkLogin();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.checkLogin();
    if (app.globalData.userInfo) {
      this.getOrderCount();
      this.getCouponCount();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.checkLogin();
    if (app.globalData.userInfo) {
      this.getOrderCount();
      this.getCouponCount();
    }
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    const token = wx.getStorageSync('token');
    if (token) {
      // 已登录，获取用户信息
      this.getUserInfo();
    } else {
      // 未登录
      this.setData({
        userInfo: null
      });
    }
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    userApi.getUserInfo().then(res => {
      if (res.success && res.data) {
        app.globalData.userInfo = res.data;
        this.setData({
          userInfo: res.data
        });
        console.log('[USER] 获取用户信息成功', res.data);
      } else {
        this.setData({
          userInfo: null
        });
        app.globalData.userInfo = null;
        wx.removeStorageSync('token');
        console.log('[USER] 获取用户信息失败，返回格式不对', res);
      }
    }).catch(err => {
      console.error('[USER] 获取用户信息失败', err);
      this.setData({
        userInfo: null
      });
      app.globalData.userInfo = null;
      wx.removeStorageSync('token');
    });
  },

  /**
   * 获取订单数量统计
   */
  getOrderCount() {
    orderApi.getOrderList().then(res => {
      if (res.success && res.data) {
        const orderCount = {
          pending: 0,
          paid: 0,
          shipped: 0
        };
        
        res.data.list.forEach(order => {
          if (order.status === 'pending_payment') {
            orderCount.pending++;
          } else if (order.status === 'pending_shipment') {
            orderCount.paid++;
          } else if (order.status === 'pending_receipt') {
            orderCount.shipped++;
          }
        });
        
        this.setData({ orderCount });
        console.log('[USER] 获取订单统计成功', orderCount);
      }
    }).catch(err => {
      console.error('[USER] 获取订单统计失败', err);
    });
  },

  /**
   * 获取优惠券数量统计
   */
  getCouponCount() {
    couponApi.getUserCoupons().then(res => {
      if (res.success && res.data) {
        this.setData({
          couponCount: res.data.length
        });
        console.log('[USER] 获取优惠券统计成功', res.data.length);
      }
    }).catch(err => {
      console.error('[USER] 获取优惠券统计失败', err);
    });
  },

  /**
   * 跳转到登录页
   */
  goLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  /**
   * 跳转到编辑资料页
   */
  goEditProfile() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile',
    });
  },

  /**
   * 跳转到订单列表
   */
  goOrderList(e) {
    const type = e.currentTarget.dataset.type || '';
    let statusIndex = 0; // 默认显示全部
    
    // 根据订单类型设置状态索引
    switch(type) {
      case 'pending_payment':
        statusIndex = 1; // 待付款
        break;
      case 'pending_shipment':
        statusIndex = 2; // 待发货
        break;
      case 'pending_receipt':
        statusIndex = 3; // 待收货
        break;
      case 'completed':
        statusIndex = 4; // 已完成
        break;
    }
    
    wx.navigateTo({
      url: `/pages/order/order?status=${statusIndex}`,
    });
  },

  /**
   * 跳转到优惠券页面
   */
  goCoupon() {
    wx.navigateTo({
      url: '/pages/coupon/coupon',
    });
  },

  /**
   * 跳转到收货地址页面
   */
  goAddress() {
    wx.navigateTo({
      url: '/pages/address/address',
    });
  },

  /**
   * 跳转到收藏页面
   */
  goFavorite() {
    wx.navigateTo({
      url: '/pages/favorite/favorite',
    });
  },

  /**
   * 跳转到商家中心
   */
  goMerchant() {
    wx.navigateTo({
      url: '/pages/merchant/dashboard/dashboard',
    });
  },

  /**
   * 联系客服
   */
  contactCustomerService() {
    wx.showToast({
      title: '客服电话：400-123-4567',
      icon: 'none',
      duration: 3000
    });
  },

  /**
   * 关于我们
   */
  aboutUs() {
    wx.navigateTo({
      url: '/pages/about/about',
    });
  },

  /**
   * 清除缓存
   */
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            wx.removeStorageSync('token');
            app.globalData.token = '';  // 清除全局token
            wx.showToast({
              title: '清除成功',
              icon: 'success'
            });
            // 重新登录或刷新页面
            this.checkLogin();
          } catch (e) {
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 退出登录
   */
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用全局的退出登录方法，它会清理所有登录相关的数据
          app.logout();
        }
      }
    });
  }
})